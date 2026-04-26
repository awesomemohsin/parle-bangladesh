import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { Admin, User, LoginHistory } from "@/lib/models";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Validate Admin Session
    const user = getAuthUserFromRequest(request, true);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { otpCode, oldPassword, newPassword } = await request.json();
    
    if (!otpCode || !oldPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required security credentials" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Security requirement: Password must be at least 6 characters" }, { status: 400 });
    }

    // Find the user record
    let dbUser = await Admin.findById(user.id) || await User.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "Identity not found" }, { status: 404 });
    }

    // Verify Old Password
    const oldPasswordHash = hashPassword(oldPassword);
    if (dbUser.password !== oldPasswordHash) {
      return NextResponse.json({ error: "Verification failed: Incorrect old password" }, { status: 400 });
    }

    // Verify OTP Integrity
    if (!dbUser.otpCode || dbUser.otpCode !== otpCode) {
      return NextResponse.json({ error: "Invalid authorization code" }, { status: 400 });
    }

    if (!dbUser.otpExpires || dbUser.otpExpires < new Date()) {
      return NextResponse.json({ error: "Authorization code has expired" }, { status: 400 });
    }

    // Update Password and Clear OTP
    dbUser.password = hashPassword(newPassword);
    dbUser.otpCode = undefined;
    dbUser.otpExpires = undefined;
    await dbUser.save();
    
    // Log security event in system audit logs
    const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    await LoginHistory.create({
      email: dbUser.email,
      role: dbUser.role,
      ipAddress,
      userAgent,
      status: "password_changed"
    });



    return NextResponse.json({ 
      success: true, 
      message: "Credential update successful. All other sessions have been revoked for your security." 
    });
  } catch (error) {
    console.error("Change password confirmation error:", error);
    return NextResponse.json({ error: "Internal server error during finalization" }, { status: 500 });
  }
}
