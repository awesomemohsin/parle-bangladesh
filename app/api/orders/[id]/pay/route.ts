import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await connectDB();
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.redirect(new URL("/orders?error=order_not_found", appUrl), 303);
    }

    if (order.paymentStatus === "paid") {
      return NextResponse.redirect(new URL(`/orders?payment=already_paid`, appUrl), 303);
    }

    // Initiate a fresh SSLCommerz session for this order
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX === "true";

    const sslInitUrl = isSandbox
      ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
      : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

    const payload = new URLSearchParams({
      store_id: storeId || "",
      store_passwd: storePasswd || "",
      total_amount: Number(order.total).toFixed(2),
      currency: "BDT",
      tran_id: order._id.toString(),
      success_url: `${appUrl}/api/payment/sslcommerz/success`,
      fail_url: `${appUrl}/api/payment/sslcommerz/fail`,
      cancel_url: `${appUrl}/api/payment/sslcommerz/cancel`,
      ipn_url: `${appUrl}/api/payment/sslcommerz/ipn`,
      cus_name: order.customerName,
      cus_email: order.customerEmail,
      cus_add1: order.address,
      cus_city: order.city,
      cus_postcode: order.postalCode,
      cus_country: "Bangladesh",
      cus_phone: order.customerPhone,
      shipping_method: "YES",
      ship_name: order.customerName,
      ship_add1: order.shippingAddress || order.address,
      ship_city: order.shippingCity || order.city,
      ship_postcode: order.shippingPostalCode || order.postalCode,
      ship_country: "Bangladesh",
      num_of_item: order.items.length.toString(),
      product_name: "Parle Biscuits & Snacks",
      product_category: "Food",
      product_profile: "physical-goods",
    });

    const sslRes = await fetch(sslInitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });

    const sslData = await sslRes.json();

    if (sslData.status === "SUCCESS" && sslData.GatewayPageURL) {
      // Redirect customer to SSLCommerz checkout page
      return NextResponse.redirect(sslData.GatewayPageURL, 303);
    } else {
      console.error("SSLCommerz re-initiation failed:", sslData);
      return NextResponse.redirect(new URL(`/orders?error=gateway_failed`, appUrl), 303);
    }
  } catch (error: any) {
    console.error("Secure payment redirection handler crash:", error);
    return NextResponse.redirect(new URL(`/orders?error=internal_error`, appUrl), 303);
  }
}
