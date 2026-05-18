import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { VerificationCode, VerificationBatch } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(req as any);
    if (!user || user.email !== "mdmohsin.work@gmail.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
    }

    const batch = await VerificationBatch.findById(batchId).lean();
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const codes = await VerificationCode.find({ batchId }).select("code isVerified verifiedAt").lean();

    return NextResponse.json({
      success: true,
      batch,
      codes: codes.map(c => ({
        code: c.code,
        isVerified: c.isVerified,
        verifiedAt: c.verifiedAt || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
