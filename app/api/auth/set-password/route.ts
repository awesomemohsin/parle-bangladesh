import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Authenticate the user from the active session
    const currentUser = await getVerifiedAuthUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized. Session expired." }, { status: 401 });
    }

    const { password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    // Only update standard customer passwords
    const userDoc = await User.findById(currentUser.id);
    if (!userDoc) {
      return NextResponse.json({ error: "Customer account not found." }, { status: 404 });
    }

    userDoc.password = passwordHash;
    await userDoc.save();

    return NextResponse.json({ success: true, message: "Password updated successfully!" });
  } catch (error: any) {
    console.error("Set password API error:", error);
    return NextResponse.json({ error: "Internal server error: " + (error.message || "Unknown error") }, { status: 500 });
  }
}
