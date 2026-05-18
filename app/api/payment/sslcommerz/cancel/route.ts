import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  let tran_id = "";
  
  try {
    const formData = await req.formData();
    tran_id = formData.get("tran_id")?.toString() || "";
    console.warn(`SSLCommerz payment cancelled for transaction ID: ${tran_id || "unknown"}`);
  } catch (err) {
    console.error("Error parsing SSLCommerz cancel callback form:", err);
  }

  if (tran_id) {
    return NextResponse.redirect(new URL(`/shop/order-received/${tran_id}?payment=cancelled`, appUrl), 303);
  }
  return NextResponse.redirect(new URL("/orders?payment_status=cancelled", appUrl), 303);
}
