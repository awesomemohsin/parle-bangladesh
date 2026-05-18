import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  try {
    const formData = await req.formData();
    const tran_id = formData.get("tran_id")?.toString();
    console.warn(`SSLCommerz payment failed for transaction ID: ${tran_id || "unknown"}`);
  } catch (err) {
    console.error("Error parsing SSLCommerz fail callback form:", err);
  }

  return NextResponse.redirect(new URL("/shop/checkout?payment_status=failed", appUrl), 303);
}
