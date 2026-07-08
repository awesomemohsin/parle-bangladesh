import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

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

    const user = getAuthUserFromRequest(request);
    const isAdmin = user && ["admin", "super_admin", "owner", "moderator"].includes(user.role);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.courierConsignmentId) {
      return NextResponse.json({ error: "Order has not been dispatched to any courier" }, { status: 400 });
    }

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: "Steadfast API credentials are not configured" }, { status: 500 });
    }

    // Query status by consignment ID
    const res = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_cid/${order.courierConsignmentId}`, {
      method: "GET",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (res.status === 200 && data.status === 200 && data.delivery_status) {
      const oldStatus = order.courierStatus;
      const newStatus = data.delivery_status;
      
      order.courierStatus = newStatus;
      
      let localStatusUpdate = "";
      if (newStatus === "delivered" && order.status !== "delivered") {
        localStatusUpdate = "delivered";
      } else if (newStatus === "cancelled" && order.status !== "cancelled") {
        localStatusUpdate = "cancelled";
      }

      if (localStatusUpdate) {
        const previousStatus = order.status;
        order.status = localStatusUpdate;
        if (!order.orderLogs) order.orderLogs = [];
        order.orderLogs.push({
          fromStatus: previousStatus,
          toStatus: localStatusUpdate,
          changedBy: "Steadfast Sync",
          reason: `Automatic status sync. Courier status: ${newStatus}`,
          changedAt: new Date()
        } as any);
      } else if (oldStatus !== newStatus) {
        if (!order.orderLogs) order.orderLogs = [];
        order.orderLogs.push({
          fromStatus: order.status,
          toStatus: order.status,
          changedBy: "Steadfast Sync",
          reason: `Courier status changed from '${oldStatus}' to '${newStatus}'`,
          changedAt: new Date()
        } as any);
      }

      await order.save();

      return NextResponse.json({
        message: "Status updated successfully",
        courierStatus: newStatus,
        orderStatus: order.status,
      });
    } else {
      console.error("Steadfast tracking error response:", data);
      return NextResponse.json({
        error: data.message || "Failed to fetch status from Steadfast",
        details: data,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Track Steadfast error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
