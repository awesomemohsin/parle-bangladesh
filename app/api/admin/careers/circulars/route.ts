import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { JobCircular } from "@/lib/models";
import { getAuthUserFromRequest } from "@/lib/api-auth";

export async function GET(req: any) {
  try {
    const auth = getAuthUserFromRequest(req);
    if (!auth || !["admin", "super_admin", "owner"].includes(auth.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const circulars = await JobCircular.find({}).sort({ createdAt: -1 });
    return NextResponse.json(circulars);
  } catch (error: any) {
    console.error("Fetch circulars error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: any) {
  try {
    const auth = getAuthUserFromRequest(req);
    if (!auth || !["super_admin", "owner"].includes(auth.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    
    // Simple validation
    if (!body.title || !body.description || !body.location || !body.deadline) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const circular = await JobCircular.create(body);
    return NextResponse.json(circular, { status: 201 });
  } catch (error: any) {
    console.error("Create circular error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
