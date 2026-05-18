import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";

export async function POST(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  try {
    // SSLCommerz sends callbacks as urlencoded POST requests
    const formData = await req.formData();
    const tran_id = formData.get("tran_id")?.toString();
    const val_id = formData.get("val_id")?.toString();
    const amount = formData.get("amount")?.toString();

    if (!tran_id || !val_id) {
      console.error("SSLCommerz success callback: Missing transaction ID or validation ID");
      return NextResponse.redirect(new URL("/shop/checkout?payment_status=failed", appUrl), 303);
    }

    // 1. Verify transaction with SSLCommerz Validator API
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX === "true";

    const validateUrl = isSandbox
      ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`
      : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`;

    const verifyRes = await fetch(validateUrl, { method: "GET" });
    const verifyData = await verifyRes.json();

    if (verifyData.status === "VALID" || verifyData.status === "VALIDATED") {
      // 2. Database validation & order status update
      await connectDB();
      const order = await Order.findById(tran_id);

      if (!order) {
        console.error(`SSLCommerz success verification: Order ${tran_id} not found in database`);
        return NextResponse.redirect(new URL("/shop/checkout?payment_status=failed", appUrl), 303);
      }

      // Check if amount matches to prevent tampering (strictly fetch from SSLCommerz server response)
      const orderTotal = Number(order.total);
      const paidAmount = Number(verifyData.amount);

      if (Math.abs(orderTotal - paidAmount) > 0.1) {
        console.error(`SSLCommerz verification amount mismatch! Expected ${orderTotal}, Verified: ${paidAmount}`);
        return NextResponse.redirect(new URL("/shop/checkout?payment_status=failed", appUrl), 303);
      }

      // Update Order to paid status using updateOne to bypass Mongoose document schema validation in hot-reload memory
      await Order.updateOne(
        { _id: tran_id },
        {
          $set: {
            paymentStatus: "paid",
            status: "processing",
            paymentDetails: {
              val_id: val_id,
              bank_tran_id: formData.get("bank_tran_id")?.toString(),
              card_type: formData.get("card_type")?.toString(),
              card_brand: formData.get("card_brand")?.toString(),
              amount: paidAmount,
              verifiedAt: new Date()
            }
          }
        }
      );

      console.log(`Order #${tran_id} successfully paid via SSLCommerz!`);
      return NextResponse.redirect(new URL(`/shop/order-received/${tran_id}?payment=success`, appUrl), 303);
    } else {
      console.error("SSLCommerz callback validation failed:", verifyData);
      return NextResponse.redirect(new URL("/shop/checkout?payment_status=failed", appUrl), 303);
    }
  } catch (error: any) {
    console.error("SSLCommerz success callback handler crash:", error);
    return NextResponse.redirect(new URL("/shop/checkout?payment_status=failed", appUrl), 303);
  }
}
