import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { Admin, User } from "@/lib/models";
import { transporter, SMTP_FROM, getOTPTemplate } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Explicitly check for admin session
    const user = getAuthUserFromRequest(request, true);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access: Admin session required" }, { status: 401 });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Find in either Admin or User collection based on the token ID
    let dbUser = await Admin.findById(user.id) || await User.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "Identity not found in database" }, { status: 404 });
    }

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
        // We continue because the OTP is saved in DB, but user might be frustrated
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Authorization code dispatched to your registered email" 
    });
  } catch (error) {
    console.error("Change password request error:", error);
    return NextResponse.json({ error: "Internal server error during handshake" }, { status: 500 });
  }
}
