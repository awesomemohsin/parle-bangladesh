import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { Admin, User } from "@/lib/models";
import { transporter, SMTP_FROM, getOTPTemplate } from "@/lib/mail";

import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Explicitly check for admin session
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access: Admin session required" }, { status: 401 });
    }

    const body = await request.json();
    const { oldPassword } = body;

    if (!oldPassword) {
      return NextResponse.json({ error: "Your current password is required to initiate this request." }, { status: 400 });
    }
    
    // Find in either Admin or User collection based on the token ID
    let dbUser = await Admin.findById(user.id) || await User.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "Identity not found in database" }, { status: 404 });
    }

    // VERIFY OLD PASSWORD BEFORE SENDING OTP
    const oldPasswordHash = hashPassword(oldPassword);
    if (dbUser.password !== oldPasswordHash) {
      return NextResponse.json({ error: "Verification failed: Incorrect current password" }, { status: 400 });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    dbUser.otpCode = otpCode;
    dbUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minute window
    await dbUser.save();

    // Send OTP via SMTP
    if (transporter && SMTP_FROM) {
      try {
        await transporter.sendMail({
          from: `"Parle Security" <${SMTP_FROM}>`,
          to: dbUser.email,
          subject: "Security Protocol: OTP for Password Change",
          html: getOTPTemplate(otpCode, dbUser.name),
        });
      } catch (mailError) {
        console.error("Mail dispatch failed:", mailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Security code dispatched to your registered email" 
    });
  } catch (error) {
    console.error("Change password request error:", error);
    return NextResponse.json({ error: "Internal server error during handshake" }, { status: 500 });
  }
}
