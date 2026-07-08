import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(
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

    if (order.courierConsignmentId) {
      return NextResponse.json({ error: "Order is already dispatched to Steadfast" }, { status: 400 });
    }

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: "Steadfast API credentials are not configured" }, { status: 500 });
    }

    // Determine Cash on Delivery amount
    const isPaid = order.paymentStatus === "paid";
    const codAmount = isPaid ? 0 : order.total;

    // Build complete recipient address
    const mainAddress = order.shippingAddress || order.address;
    const thanaPart = order.shippingThana || order.thana ? `${order.shippingThana || order.thana}` : "";
    const cityPart = order.shippingCity || order.city ? `${order.shippingCity || order.city}` : "";
    const postcodePart = order.shippingPostalCode || order.postalCode ? `${order.shippingPostalCode || order.postalCode}` : "";
    
    const recipientAddress = [mainAddress, thanaPart, cityPart, postcodePart]
      .filter(Boolean)
      .join(", ");

    const payload = {
      invoice: order._id.toString(),
      recipient_name: order.customerName,
      recipient_phone: order.customerPhone,
      recipient_address: recipientAddress,
      cod_amount: codAmount,
      note: order.instruction || "",
    };

    const res = await fetch("https://portal.steadfast.com.bd/api/v1/create_order", {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.status === 200 && data.status === 200 && data.consignment) {
      order.courierName = "Steadfast";
      order.courierConsignmentId = String(data.consignment.consignment_id);
      order.courierTrackingCode = String(data.consignment.tracking_code);
      order.courierStatus = String(data.consignment.status);
      
      // Add order log
      if (!order.orderLogs) order.orderLogs = [];
      order.orderLogs.push({
        fromStatus: order.status,
        toStatus: order.status,
        changedBy: user.name || user.email || "Admin",
        reason: `Dispatched to Steadfast Courier. Consignment ID: ${data.consignment.consignment_id}, Tracking Code: ${data.consignment.tracking_code}`,
        changedAt: new Date()
      } as any);

      await order.save();

      return NextResponse.json({
        message: "Order successfully booked in Steadfast",
        consignment: data.consignment,
      });
    } else {
      console.error("Steadfast API error response:", data);
      return NextResponse.json({
        error: data.message || "Failed to book parcel with Steadfast",
        details: data,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Send Steadfast error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
