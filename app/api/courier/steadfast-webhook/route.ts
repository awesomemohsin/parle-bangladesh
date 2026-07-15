import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order, Product, StockLog } from "@/lib/models";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  await connectDB();
  
  // 1. Capture request info for logging
  const headersObj: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  const url = request.url;
  const searchParams = Object.fromEntries(new URL(url).searchParams.entries());

  let rawBody = "";
  let payload: any = null;
  let parseError = null;

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody);
  } catch (e: any) {
    parseError = e.message || String(e);
  }

  // Save the log document to the database
  let logId: any = null;
  try {
    const db = mongoose.connection.db;
    if (db) {
      const logResult = await db.collection("steadfast_webhook_logs").insertOne({
        receivedAt: new Date(),
        url,
        searchParams,
        headers: headersObj,
        rawBody,
        payload,
        parseError,
        status: "pending",
      });
      logId = logResult.insertedId;
    }
  } catch (dbError) {
    console.error("[Webhook Log Error]: Failed to write log to DB", dbError);
  }

  const updateLog = async (updateData: any) => {
    if (!logId) return;
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.collection("steadfast_webhook_logs").updateOne(
          { _id: logId },
          { $set: { ...updateData, updatedAt: new Date() } }
        );
      }
    } catch (dbError) {
      console.error("[Webhook Log Error]: Failed to update log in DB", dbError);
    }
  };

  let session: mongoose.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    
    await session.withTransaction(async () => {
      // 2. Verify Authorization Token
      const authHeader = headersObj["authorization"] || request.headers.get("authorization");
      const configuredToken = process.env.STEADFAST_WEBHOOK_TOKEN;
      
      if (configuredToken) {
        if (authHeader !== `Bearer ${configuredToken}`) {
          console.warn(`[Webhook Unauthorized] Received token: ${authHeader}`);
          throw new Error("UNAUTHORIZED_WEBHOOK_CALL");
        }
      }

      // 3. Check Payload Parse
      if (parseError || !payload) {
        throw new Error("INVALID_PAYLOAD_PARSE");
      }

      const { consignment_id, invoice, status } = payload;

      // Handle missing/empty invoice gracefully (ignore request)
      if (!invoice) {
        console.warn(`[Steadfast Webhook] Empty invoice in payload.`);
        throw new Error("EMPTY_INVOICE_IGNORED");
      }

      // 4. Find the order
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
        console.warn(`[Steadfast Webhook] Order not found for invoice ID: ${invoice}`);
        throw new Error("ORDER_NOT_FOUND_IGNORED");
      }

      // 5. Update the order status
      const oldCourierStatus = order.courierStatus;
      const newCourierStatus = status ? String(status).trim().toLowerCase() : "";

      if (newCourierStatus) {
        order.courierStatus = newCourierStatus;
      }
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
          reason: `Automatic status sync. Courier status: ${newCourierStatus || 'None'}. Tracking: ${trackingMsg || 'None'}`,
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

                  await Product.updateOne({ _id: product._id }, update, { session: session || undefined });

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
                  }], { session: session || undefined });
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
            await reconcileUserLedger(order.userId.toString(), session || undefined);
          }
        }
      } else if (oldCourierStatus !== newCourierStatus || trackingMsg) {
        if (!order.orderLogs) order.orderLogs = [];
        const isPartialDelivered = newCourierStatus === "partial_delivered";
        order.orderLogs.push({
          fromStatus: order.status,
          toStatus: order.status,
          changedBy: "Steadfast Webhook",
          reason: isPartialDelivered
            ? "Courier status updated to PARTIALLY DELIVERED. Please reconcile returned items and update this order manually."
            : `Courier status: '${newCourierStatus || oldCourierStatus}'${trackingMsg ? `. Tracking: ${trackingMsg}` : ''}`,
          changedAt: new Date()
        } as any);
        console.log(`[Steadfast Webhook] Order ${order._id} courierStatus/tracking updated. CourierStatus: ${newCourierStatus}`);
      }

      await order.save({ session: session || undefined });
    });

    const parsedInvoice = payload?.invoice;
    const db = mongoose.connection.db;
    let foundOrder: any = null;
    if (db && parsedInvoice) {
      if (parsedInvoice.length === 24) {
        foundOrder = await db.collection("orders").findOne({ _id: new mongoose.Types.ObjectId(parsedInvoice) });
      } else {
        foundOrder = await db.collection("orders").findOne({
          $expr: {
            $eq: [
              { $substr: [ { $toString: "$_id" }, 16, 8 ] },
              parsedInvoice.toLowerCase()
            ]
          }
        });
      }
    }

    await updateLog({ status: "success", orderId: foundOrder?._id, responseCode: 200 });
    return NextResponse.json({ success: true, message: "Webhook processed successfully" });

  } catch (error: any) {
    console.error("Steadfast webhook error:", error);

    if (error.message === "UNAUTHORIZED_WEBHOOK_CALL") {
      const authHeader = headersObj["authorization"] || request.headers.get("authorization");
      await updateLog({ status: "unauthorized", error: "Token verification failed", receivedToken: authHeader, responseCode: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error.message === "INVALID_PAYLOAD_PARSE") {
      await updateLog({ status: "failed", error: `Payload parse error: ${parseError}`, responseCode: 400 });
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error.message === "EMPTY_INVOICE_IGNORED") {
      await updateLog({ status: "ignored", error: "Empty invoice in payload. Request ignored.", responseCode: 200 });
      return NextResponse.json({ success: true, message: "Ignored (empty invoice)" });
    }

    if (error.message === "ORDER_NOT_FOUND_IGNORED") {
      await updateLog({ status: "ignored", error: `Order not found for invoice: ${payload?.invoice}`, responseCode: 200 });
      return NextResponse.json({ success: true, message: "Ignored (order not found)" });
    }

    // Default internal server error
    await updateLog({ status: "error", error: error.message || String(error), responseCode: 500 });
    return NextResponse.json({ error: "Internal server error: " + (error.message || String(error)) }, { status: 500 });

  } finally {
    if (session) {
      session.endSession();
    }
  }
}
