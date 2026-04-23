import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { JobCircular } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const circulars = await JobCircular.find({});
    return NextResponse.json({ circulars });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
