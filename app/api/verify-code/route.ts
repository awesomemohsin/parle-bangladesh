import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { VerificationCode } from "@/lib/models";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // 1. Check if code exists
    const record = await VerificationCode.findOne({ code: cleanCode });

    if (!record) {
      return NextResponse.json({
        status: "invalid",
        error: "This verification code is invalid. Please double check the code printed on the product. If correct, this product may be a counterfeit.",
      }, { status: 404 });
    }

    // 2. If it is already verified
    if (record.isVerified) {
      return NextResponse.json({
        status: "already_verified",
        error: `WARNING: This product code has already been verified!`,
        productName: record.productName,
        verifiedAt: record.verifiedAt,
      }, { status: 400 });
    }

    // 3. Mark it verified atomically
    record.isVerified = true;
    record.verifiedAt = new Date();
    record.verifiedByIP = ip;
    await record.save();

    return NextResponse.json({
      status: "success",
      message: "Congratulations! Your product is 100% authentic and genuine.",
      productName: record.productName,
      verifiedAt: record.verifiedAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
