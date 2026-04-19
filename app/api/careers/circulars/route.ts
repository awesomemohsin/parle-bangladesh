import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { JobCircular } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const circulars = await JobCircular.find({ isActive: true }).sort({ createdAt: -1 });
    return NextResponse.json(circulars);
  } catch (error) {
    console.error("Fetch circulars error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
