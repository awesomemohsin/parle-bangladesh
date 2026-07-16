import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Order } from "@/lib/models";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tran_id = formData.get("tran_id")?.toString();
    const val_id = formData.get("val_id")?.toString();
    const status = formData.get("status")?.toString();
    const amount = formData.get("amount")?.toString();

    if (!tran_id || !val_id) {
      return NextResponse.json({ error: "Missing required transaction parameters" }, { status: 400 });
    }

    // Call SSLCommerz Validator API server-to-server to prevent spoofed/fake IPN payloads
    const storeId = process.env.SSLCOMMERZ_STORE_ID;
    const storePasswd = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX === "true";

    const validateUrl = isSandbox
      ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`
      : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${storeId}&store_passwd=${storePasswd}&v=1&format=json`;

    const verifyRes = await fetch(validateUrl, { method: "GET" });
    const verifyData = await verifyRes.json();

    if (verifyData.status === "VALID" || verifyData.status === "VALIDATED") {
      await connectDB();
      const order = await Order.findById(tran_id);

      if (order && order.paymentStatus !== "paid") {
        const orderTotal = Number(order.total);
        const paidAmount = Number(verifyData.amount);

        // Verify total matches paid amount fetched directly from SSLCommerz API
        if (Math.abs(orderTotal - paidAmount) <= 0.1) {
          await Order.updateOne(
            { _id: tran_id },
            {
              $set: {
                paymentStatus: "paid",
                status: "processing",
                paymentDetails: {
                  val_id: val_id,
                  bank_tran_id: verifyData.bank_tran_id || formData.get("bank_tran_id")?.toString(),
                  card_type: verifyData.card_type || formData.get("card_type")?.toString(),
                  card_brand: verifyData.card_brand || formData.get("card_brand")?.toString(),
                  amount: paidAmount,
                  verifiedAt: new Date()
                }
              }
            }
          );

          // Trigger background Steadfast trust check automatically
          import("@/lib/steadfast-fraud").then(({ triggerSteadfastTrustCheck }) => {
            triggerSteadfastTrustCheck(tran_id, order.customerPhone);
          }).catch(err => console.error("Failed to load steadfast-fraud helper:", err));

          console.log(`IPN notification: Order #${tran_id} updated securely to PAID status after backend verification.`);
        } else {
          console.error(`IPN notification: Mismatch between order total (${orderTotal}) and verified paid amount (${paidAmount})!`);
        }
      }
    } else {
      console.error("IPN notification: SSLCommerz validation failed or invalid signature:", verifyData);
    }

    return NextResponse.json({ status: "SUCCESS" });
  } catch (error: any) {
    console.error("SSLCommerz IPN listener crash:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
