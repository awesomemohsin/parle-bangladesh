import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { User, Order, Customer } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const phone = (searchParams.get("phone") || "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Strip non-digit characters
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Support matching BD formats (e.g. 01712345678, +8801712345678, 8801712345678)
    let phoneVariations = [phone];
    if (cleanPhone) {
      phoneVariations.push(cleanPhone);
      if (cleanPhone.startsWith("01") && cleanPhone.length === 11) {
        phoneVariations.push(`+88${cleanPhone}`);
        phoneVariations.push(`88${cleanPhone}`);
      } else if (cleanPhone.startsWith("8801") && cleanPhone.length === 13) {
        const local = cleanPhone.slice(2);
        phoneVariations.push(local);
        phoneVariations.push(`+${cleanPhone}`);
      }
    }
    
    // Remove duplicate variations
    phoneVariations = Array.from(new Set(phoneVariations));

    // 1. Check if there is a User in the DB with this mobile
    const user = await User.findOne({
      mobile: { $in: phoneVariations }
    }).lean();

    if (user && user.email && !user.email.endsWith("@phone.parle.com")) {
      return NextResponse.json({ email: user.email, isRegistered: true });
    }

    // 2. Check if there is a Guest Customer record in the DB with this mobile
    const customer = await Customer.findOne({
      $and: [
        { mobile: { $in: phoneVariations } },
        { email: { $exists: true, $ne: "" } },
        { email: { $not: /@phone\.parle\.com$/i } }
      ]
    }).lean();

    if (customer && customer.email) {
      return NextResponse.json({ email: customer.email, isRegistered: false });
    }

    // 3. Fallback: Check if there is an Order in the DB with this phone number having a real email
    const order = await Order.findOne({
      $and: [
        { customerPhone: { $in: phoneVariations } },
        { customerEmail: { $exists: true, $ne: "" } },
        { customerEmail: { $not: /@phone\.parle\.com$/i } }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

    if (order && order.customerEmail) {
      return NextResponse.json({ email: order.customerEmail, isRegistered: false });
    }

    return NextResponse.json({ email: null });
  } catch (error: any) {
    console.error("[Lookup] Error looking up email by phone:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
