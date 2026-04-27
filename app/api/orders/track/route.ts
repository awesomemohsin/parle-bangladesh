import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId")?.trim();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Search for order. Since we use short IDs (8 chars), we'll match by suffix.
    
    const orders = await Order.find({}).lean();
    
    // Now filter by orderId (either full ID or short ID suffix)
    const matchingOrder = orders.find((o: any) => {
        const fullId = o._id.toString();
        const shortId = fullId.slice(-8).toUpperCase();
        return fullId === orderId || shortId === orderId.toUpperCase();
    });

    if (!matchingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Limit details for privacy (No Customer Name)
    const trackedData = {
      id: matchingOrder._id.toString(),
      shortId: matchingOrder._id.toString().slice(-8).toUpperCase(),
      status: matchingOrder.status,
      createdAt: matchingOrder.createdAt,
      items: matchingOrder.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight,
        flavor: item.flavor
      })),
      subtotal: matchingOrder.subtotal,
      shippingCost: matchingOrder.shippingCost,
      discountAmount: matchingOrder.discountAmount,
      total: matchingOrder.total,
      shippingAddress: matchingOrder.shippingAddress || matchingOrder.address,
      shippingCity: matchingOrder.shippingCity || matchingOrder.city,
      shippingPostalCode: matchingOrder.shippingPostalCode || matchingOrder.postalCode,
      deliveryMethod: matchingOrder.deliveryMethod,
      paymentMethod: matchingOrder.paymentMethod,
    };

    return NextResponse.json(trackedData);
  } catch (error) {
    console.error("Order tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
