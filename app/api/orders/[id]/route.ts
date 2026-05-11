import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import { notifyOrderReady, notifyCriticalEvent } from "@/lib/telegram";
import { ORDER_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Security check: only allow the owner or an admin to see the order
    const user = getAuthUserFromRequest(request);
    const isAdmin = user && ["admin", "super_admin", "owner", "moderator"].includes(user.role);
    
    // For guest orders, we might want to allow viewing if they have the ID, 
    // but ideally we should verify email/phone too. 
    // For now, we'll allow viewing by ID since it's a GUID and used for the success page.
    // If it's a logged-in order, verify the user.
    if (order.userId && (!user || user.id !== order.userId.toString()) && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized access to this order" }, { status: 403 });
    }

    const mappedOrder = {
      ...order,
      id: order._id.toString()
    };
    delete (mappedOrder as any)._id;
    delete (mappedOrder as any).__v;

    return NextResponse.json(mappedOrder);
  } catch (error: any) {
    console.error("Order GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { status, statusReason } = body;

    const user = getAuthUserFromRequest(request);
    if (!user || !["admin", "super_admin", "owner", "moderator"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const oldStatus = order.status;
    
    // Moderators cannot move orders back to pending
    if (user.role === "moderator" && status === "pending") {
      return NextResponse.json({ error: "Moderators cannot move orders back to pending" }, { status: 403 });
    }

    // Update order
    order.status = status;
    if (statusReason) order.statusReason = statusReason;

    // Add log
    if (!order.orderLogs) order.orderLogs = [];
    order.orderLogs.push({
      fromStatus: oldStatus,
      toStatus: status,
      changedBy: user.name || user.email,
      reason: statusReason,
      changedAt: new Date(),
    });

    // If status changed to cancelled, damaged, or lost, restore stock
    const restorableStatuses = ["cancelled", "damaged", "lost"];
    if (restorableStatuses.includes(status) && !restorableStatuses.includes(oldStatus)) {
      const { Product } = await import("@/lib/models");
      for (const item of order.items) {
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product && product.variations) {
            const varIndex = product.variations.findIndex((v: any) => {
              const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
              const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
              return weightMatch && flavorMatch;
            });
            
            if (varIndex !== -1) {
              const holdField = `variations.${varIndex}.holdStock`;
              const stockField = `variations.${varIndex}.stock`;
              const lostField = `variations.${varIndex}.lostCount`;
              const damagedField = `variations.${varIndex}.damagedCount`;

              const update: any = { $inc: {} };
              
              // Remove from hold anyway
              update.$inc[holdField] = -item.quantity;

              if (status === "cancelled") {
                // Return to stock
                update.$inc[stockField] = item.quantity;
              } else if (status === "lost") {
                update.$inc[lostField] = item.quantity;
              } else if (status === "damaged") {
                update.$inc[damagedField] = item.quantity;
              }

              await Product.updateOne({ _id: product._id }, update);
            }
          }
        }
      }
    }

    // If status changed to delivered, remove from hold
    if (status === "delivered" && oldStatus !== "delivered") {
      const { Product } = await import("@/lib/models");
      for (const item of order.items) {
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product && product.variations) {
             const varIndex = product.variations.findIndex((v: any) => {
              const weightMatch = (!item.weight && !v.weight) || (item.weight === v.weight);
              const flavorMatch = (!item.flavor && !v.flavor) || (item.flavor === v.flavor);
              return weightMatch && flavorMatch;
            });
            if (varIndex !== -1) {
              const holdField = `variations.${varIndex}.holdStock`;
              const deliveredField = `variations.${varIndex}.deliveredCount`;
              await Product.updateOne(
                { _id: product._id },
                { $inc: { [holdField]: -item.quantity, [deliveredField]: item.quantity } }
              );
            }
          }
        }
      }
    }

    await order.save();

    // Telegram Notifications
    try {
      console.log(`Order ${id} status change: ${oldStatus} -> ${status}`);
      if (status === ORDER_STATUS.PROCESSING && oldStatus === ORDER_STATUS.PENDING) {
        console.log(`Triggering Logistics notification for order ${id}`);
        const notified = await notifyOrderReady(order);
        console.log(`Logistics notification result: ${notified}`);
      } else if (["cancelled", "damaged", "lost"].includes(status) && oldStatus !== status) {
        console.log(`Triggering Management notification for critical status: ${status}`);
        await notifyCriticalEvent(`Order ${status}`, order, statusReason);
      }
    } catch (notifyError) {
      console.error("Failed to send status update notification:", notifyError);
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Order PUT error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
