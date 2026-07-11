import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authorization Token
    const authHeader = request.headers.get("authorization");
    const configuredToken = process.env.STEADFAST_WEBHOOK_TOKEN;
    
    if (configuredToken) {
      if (authHeader !== `Bearer ${configuredToken}`) {
        console.warn(`[Webhook Unauthorized] Received token: ${authHeader}`);
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
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    // 3. Connect to DB and find the order
    await connectDB();
    let order;
    if (invoice.length === 24) {
      order = await Order.findById(invoice);
    } else {
      order = await Order.findOne({
        $expr: {
          $eq: [
            { $substr: [ { $toString: "$_id" }, 16, 8 ] },
            invoice.toLowerCase()
          ]
        }
      });
    }

    if (!order) {
      console.error(`[Steadfast Webhook] Order not found for invoice ID: ${invoice}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 4. Update the order status
    const oldCourierStatus = order.courierStatus;
    const newCourierStatus = String(status).trim().toLowerCase();

    order.courierStatus = newCourierStatus;
    order.courierConsignmentId = String(consignment_id || order.courierConsignmentId);
    order.courierName = "Steadfast";

    let localStatusUpdate = "";
    if (newCourierStatus === "delivered" || newCourierStatus === "partial_delivered") {
      if (order.status !== "delivered") localStatusUpdate = "delivered";
    } else if (newCourierStatus === "cancelled") {
      if (order.status !== "cancelled") localStatusUpdate = "cancelled";
    } else if (newCourierStatus === "in_transit") {
      if (order.status !== "shipped") localStatusUpdate = "shipped";
    } else if (newCourierStatus === "return") {
      if (order.status !== "returned") localStatusUpdate = "returned";
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
        reason: `Automatic status sync. Courier status: ${newCourierStatus}`,
        changedAt: new Date()
      } as any);
      console.log(`[Steadfast Webhook] Order ${order._id} status updated from '${previousStatus}' to '${localStatusUpdate}'`);
    } else if (oldCourierStatus !== newCourierStatus) {
      if (!order.orderLogs) order.orderLogs = [];
      order.orderLogs.push({
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: "Steadfast Webhook",
        reason: `Courier status changed from '${oldCourierStatus}' to '${newCourierStatus}'`,
        changedAt: new Date()
      } as any);
      console.log(`[Steadfast Webhook] Order ${order._id} courierStatus updated from '${oldCourierStatus}' to '${newCourierStatus}'`);
    }

    await order.save();

    return NextResponse.json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("Steadfast webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
