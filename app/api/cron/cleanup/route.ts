import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { runBackgroundCleanups } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");
    const cronSecret = process.env.FEED_SECRET_KEY || "parle_secure_feed_2026_key";

    if (secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid secret key" }, { status: 401 });
    }

    await connectDB();
    await runBackgroundCleanups();

    return NextResponse.json({ success: true, message: "Background cleanups executed successfully." });
  } catch (error: any) {
    console.error("Cron Cleanup GET error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
