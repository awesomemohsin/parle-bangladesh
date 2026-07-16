import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = getAuthUserFromRequest(request);
    const isAdmin = user && ["admin", "super_admin", "owner", "moderator"].includes(user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: "Steadfast API credentials are not configured" }, { status: 500 });
    }

    // Find all active orders booked with Steadfast (excluding finalized statuses)
    const activeOrders = await Order.find({
      courierName: "Steadfast",
      courierConsignmentId: { $exists: true, $ne: "" },
      status: { $nin: ["delivered", "cancelled", "returned", "lost", "damaged"] }
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({
        message: "No active Steadfast orders to sync.",
        syncedCount: 0,
        updatedCount: 0
      });
    }

    const baseUrl = process.env.STEADFAST_API_URL || "https://portal.packzy.com/api/v1";
    let syncedCount = 0;
    let updatedCount = 0;

    for (const order of activeOrders) {
      try {
        const res = await fetch(`${baseUrl}/status_by_cid/${order.courierConsignmentId}`, {
          method: "GET",
          headers: {
            "Api-Key": apiKey,
            "Secret-Key": secretKey,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data.status === 200 && data.delivery_status) {
            const oldCourierStatus = order.courierStatus;
            const newCourierStatus = data.delivery_status;

            order.courierStatus = newCourierStatus;
            
            let localStatusUpdate = "";
            const isTransitCourierStatus = ["in_transit", "picked_up"].includes(newCourierStatus);

            if (newCourierStatus === "delivered") {
              if (order.status !== "delivered") localStatusUpdate = "delivered";
            } else if (isTransitCourierStatus) {
              if (order.status === "pending" || order.status === "processing") {
                localStatusUpdate = "shipped";
              }
            }

            let wasUpdated = false;

            if (localStatusUpdate) {
              const previousStatus = order.status;
              order.status = localStatusUpdate;
              if (!order.orderLogs) order.orderLogs = [];
              order.orderLogs.push({
                fromStatus: previousStatus,
                toStatus: localStatusUpdate,
                changedBy: "Steadfast Bulk Sync",
                reason: `Automatic status sync. Courier status: ${newCourierStatus}`,
                changedAt: new Date()
              } as any);
              wasUpdated = true;
            } else if (oldCourierStatus !== newCourierStatus) {
              if (!order.orderLogs) order.orderLogs = [];
              const isPartialDelivered = newCourierStatus === "partial_delivered";
              order.orderLogs.push({
                fromStatus: order.status,
                toStatus: order.status,
                changedBy: "Steadfast Bulk Sync",
                reason: isPartialDelivered
                  ? "Courier status updated to PARTIALLY DELIVERED. Please reconcile returned items and update this order manually."
                  : `Courier status changed from '${oldCourierStatus}' to '${newCourierStatus}'`,
                changedAt: new Date()
              } as any);
              wasUpdated = true;
            }

            await order.save();
            syncedCount++;
            if (wasUpdated) {
              updatedCount++;
            }
          }
        }
      } catch (orderError) {
        console.error(`Error syncing order ${order._id}:`, orderError);
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} orders. Updated ${updatedCount} orders.`,
      syncedCount,
      updatedCount
    });
  } catch (error: any) {
    console.error("Bulk sync Steadfast error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
