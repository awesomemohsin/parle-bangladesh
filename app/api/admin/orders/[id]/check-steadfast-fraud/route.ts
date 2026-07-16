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

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: "Steadfast API credentials are not configured" }, { status: 500 });
    }

    // Normalize phone number to 11 digits (e.g. 017XXXXXXXX)
    let phone = order.customerPhone.replace(/[^0-9]/g, "");
    if (phone.startsWith("880")) {
      phone = phone.slice(2);
    } else if (!phone.startsWith("0") && phone.length === 10) {
      phone = "0" + phone;
    }

    const baseUrl = process.env.STEADFAST_API_URL || "https://portal.packzy.com/api/v1";
    const res = await fetch(`${baseUrl}/delivery_check/${phone}`, {
      method: "GET",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (res.status === 200) {
      return NextResponse.json({
        success: true,
        success_rate: data.success_rate || 0,
        success_parcel: data.success_parcel || 0,
        avoid_parcel: data.avoid_parcel || 0,
        total_parcel: data.total_parcel || 0,
      });
    } else {
      console.error("Steadfast delivery check error response:", data);
      return NextResponse.json({
        error: data.message || "Failed to fetch delivery details from Steadfast",
        details: data,
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Check Steadfast fraud error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
