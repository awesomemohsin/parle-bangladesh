import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order, Product, StockLog } from "@/lib/models";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Verify Authorization Token
    const authHeader = request.headers.get("authorization");
    const configuredToken = process.env.STEADFAST_WEBHOOK_TOKEN;
    
    if (configuredToken) {
      if (authHeader !== `Bearer ${configuredToken}`) {
        console.warn(`[Webhook Unauthorized] Received token: ${authHeader}`);
        await session.abortTransaction();
        session.endSession();
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      console.warn("STEADFAST_WEBHOOK_TOKEN is not configured in environment variables. Webhook is open!");
    }

    // 2. Parse Payload
    const payload = await request.json();
    console.log("[Steadfast Webhook Payload]:", payload);
    const { consignment_id, invoice, status } = payload;

    if (!invoice || !status) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    // 3. Find the order
    let order;
    if (invoice.length === 24) {
      order = await Order.findById(invoice).session(session);
    } else {
      order = await Order.findOne({
        $expr: {
          $eq: [
            { $substr: [ { $toString: "$_id" }, 16, 8 ] },
            invoice.toLowerCase()
          ]
        }
      }).session(session);
    }

    if (!order) {
      console.error(`[Steadfast Webhook] Order not found for invoice ID: ${invoice}`);
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 4. Update the order status
    const oldCourierStatus = order.courierStatus;
    const newCourierStatus = String(status).trim().toLowerCase();

    order.courierStatus = newCourierStatus;
    order.courierConsignmentId = String(consignment_id || order.courierConsignmentId);
    order.courierName = "Steadfast";

    // Parse tracking updates comment to check if the return is physically complete
    const trackingMsg = (payload.tracking_message || payload.message || payload.comment || payload.tracking_log || "").toLowerCase();
    const isPhysicalReturnComplete = 
      trackingMsg.includes("returned to sender") || 
      trackingMsg.includes("returned to merchant") || 
      trackingMsg.includes("returned to sender/merchant successfully");

    let localStatusUpdate = "";
    if (newCourierStatus === "delivered") {
      if (order.status !== "delivered") localStatusUpdate = "delivered";
    } else if (newCourierStatus === "cancelled" || newCourierStatus === "return" || newCourierStatus === "returned_to_merchant") {
      if (isPhysicalReturnComplete) {
        // Once physically received back, mark as cancelled and restore stock
        if (order.status !== "cancelled") localStatusUpdate = "cancelled";
      } else {
        // Otherwise, mark as cancellation_pending, keep stock on hold
        if (order.status !== "cancellation_pending" && order.status !== "cancelled") {
          localStatusUpdate = "cancellation_pending";
        }
      }
    } else if (newCourierStatus === "lost") {
      if (order.status !== "lost") localStatusUpdate = "lost";
    } else if (newCourierStatus === "damaged") {
      if (order.status !== "damaged") localStatusUpdate = "damaged";
    }

    if (localStatusUpdate) {
      const previousStatus = order.status;
      order.status = localStatusUpdate;
      if (!order.orderLogs) order.orderLogs = [];
      order.orderLogs.push({
        fromStatus: previousStatus,
        toStatus: localStatusUpdate,
        changedBy: "Steadfast Webhook",
        reason: `Automatic status sync. Courier status: ${newCourierStatus}. Tracking: ${trackingMsg || 'None'}`,
        changedAt: new Date()
      } as any);
      console.log(`[Steadfast Webhook] Order ${order._id} status updated from '${previousStatus}' to '${localStatusUpdate}'`);

      // Adjust stock if transitioning to restorable terminal statuses
      const restorableStatuses = ["cancelled", "damaged", "lost", "returned"];
      if (restorableStatuses.includes(localStatusUpdate) && !restorableStatuses.includes(previousStatus)) {
        for (const item of order.items) {
          if (item.productId) {
            const product = await Product.findById(item.productId).session(session);
            if (product && product.variations) {
              const varIndex = product.variations.findIndex((v: any) => {
                const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
                const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
                return weightMatch && flavorMatch;
              });
              
              if (varIndex !== -1) {
                const variation = product.variations[varIndex];
                const holdField = `variations.${varIndex}.holdStock`;
                const stockField = `variations.${varIndex}.stock`;
                const lostField = `variations.${varIndex}.lostCount`;
                const damagedField = `variations.${varIndex}.damagedCount`;
                const deliveredField = `variations.${varIndex}.deliveredCount`;

                const update: any = { $inc: {} };
                
                if (previousStatus === "delivered") {
                  update.$inc[deliveredField] = -item.quantity;
                } else {
                  update.$inc[holdField] = -item.quantity;
                }

                if (localStatusUpdate === "cancelled" || localStatusUpdate === "returned") {
                  // Return to stock
                  update.$inc[stockField] = item.quantity;
                } else if (localStatusUpdate === "lost") {
                  update.$inc[lostField] = item.quantity;
                } else if (localStatusUpdate === "damaged") {
                  update.$inc[damagedField] = item.quantity;
                }

                await Product.updateOne({ _id: product._id }, update, { session });

                // Log stock adjustment
                await StockLog.create([{
                  productId: product._id,
                  productName: product.name,
                  variationIndex: varIndex,
                  weight: item.weight,
                  flavor: item.flavor,
                  oldStock: variation.stock || 0,
                  newStock: (variation.stock || 0) + (localStatusUpdate === "cancelled" || localStatusUpdate === "returned" ? item.quantity : 0),
                  amount: item.quantity,
                  reason: `Order ${localStatusUpdate.toUpperCase()} (Steadfast Webhook Sync) - Order #${order._id.toString().slice(-8).toUpperCase()}`,
                  adminEmail: "system-webhook",
                }], { session });
              }
            }
          }
        }

        // Adjust payment/receivables balances
        order.amountPaid = 0;
        order.amountDue = 0;
        order.paymentStatus = "pending";

        if (order.userId) {
          const { reconcileUserLedger } = await import("@/lib/ledger");
          await reconcileUserLedger(order.userId.toString(), session);
        }
      }
    } else if (oldCourierStatus !== newCourierStatus) {
      if (!order.orderLogs) order.orderLogs = [];
      const isPartialDelivered = newCourierStatus === "partial_delivered";
      order.orderLogs.push({
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: "Steadfast Webhook",
        reason: isPartialDelivered
          ? "Courier status updated to PARTIALLY DELIVERED. Please reconcile returned items and update this order manually."
          : `Courier status changed from '${oldCourierStatus}' to '${newCourierStatus}'${trackingMsg ? `. Tracking: ${trackingMsg}` : ''}`,
        changedAt: new Date()
      } as any);
      console.log(`[Steadfast Webhook] Order ${order._id} courierStatus updated from '${oldCourierStatus}' to '${newCourierStatus}'`);
    }

    await order.save({ session });
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Steadfast webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
