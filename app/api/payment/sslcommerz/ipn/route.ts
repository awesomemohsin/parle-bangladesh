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

    if (status === "VALID" || status === "VALIDATED") {
      await connectDB();
      const order = await Order.findById(tran_id);

      if (order && order.paymentStatus !== "paid") {
        const orderTotal = Number(order.total);
        const paidAmount = Number(amount);

        // Verify total matches paid amount
        if (Math.abs(orderTotal - paidAmount) <= 0.1) {
          order.paymentStatus = "paid";
          order.paymentDetails = {
            val_id: val_id,
            bank_tran_id: formData.get("bank_tran_id")?.toString(),
            card_type: formData.get("card_type")?.toString(),
            card_brand: formData.get("card_brand")?.toString(),
            amount: paidAmount,
            verifiedAt: new Date()
          };
          order.status = "processing";
          await order.save();
          console.log(`IPN notification: Order #${tran_id} updated securely to PAID status.`);
        }
      }
    }

    return NextResponse.json({ status: "SUCCESS" });
  } catch (error: any) {
    console.error("SSLCommerz IPN listener crash:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
