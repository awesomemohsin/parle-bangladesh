import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import { CareerApplication } from "@/lib/models";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return NextResponse.json({ appliedPositions: [] });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      return NextResponse.json({ appliedPositions: [] });
    }

    await connectDB();
    const emailLower = decoded.email.toLowerCase().trim();

    // Fetch all positions this email has applied for
    const applications = await CareerApplication.find({ email: emailLower }).select('position');
    const appliedPositions = applications.map(app => app.position);

    return NextResponse.json({ appliedPositions });
  } catch (error) {
    console.error("Fetch applications error:", error);
    return NextResponse.json({ appliedPositions: [] }, { status: 500 });
  }
}
