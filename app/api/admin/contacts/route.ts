import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ContactSubmission } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function GET(req: any) {
  try {
    const auth = await getAuthUserFromRequest(req);
    if (!auth || !["admin", "super_admin", "owner"].includes(auth.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query = {};
    if (type && type !== "all") {
      query = { type };
    }

    const contacts = await ContactSubmission.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error) {
    console.error("Admin contacts error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
