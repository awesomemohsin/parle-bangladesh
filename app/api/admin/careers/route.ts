import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { CareerApplication } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function GET(req: any) {
  try {
    const auth = getAuthUserFromRequest(req);
    if (!auth || !["admin", "super_admin", "owner"].includes(auth.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const position = searchParams.get("position");

    let query = {};
    if (position && position !== "all") {
      query = { position };
    }

    const applications = await CareerApplication.find(query).sort({ createdAt: -1 });

    // Mark all as seen
    await CareerApplication.updateMany({ isSeen: false }, { isSeen: true });

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error("Admin careers error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
