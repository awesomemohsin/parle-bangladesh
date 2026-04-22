import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";
import { transporter, getResetPasswordTemplate, SMTP_FROM } from "@/lib/mail";
import { getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    let user = await User.findOne({ email: emailLower });
    
    if (!user) {
      user = await Admin.findOne({ email: emailLower });
    }
    
    if (!user) {
      // Return success even if not found to prevent email enumeration
      return NextResponse.json({ message: "If an account exists, a password reset link has been created." }, { status: 200 });
    }

    // Rate Limiting Logic: 3 times a day
    const now = new Date();
    const isSameDay = user.lastResetRequest && 
      new Date(user.lastResetRequest).toDateString() === now.toDateString();

    if (isSameDay) {
      if ((user.resetRequestCount || 0) >= 3) {
        return NextResponse.json({ 
          error: "Security limit reached. You can only request 3 reset links per day. Please try again tomorrow." 
        }, { status: 429 });
      }
      user.resetRequestCount = (user.resetRequestCount || 0) + 1;
    } else {
      user.resetRequestCount = 1;
    }
    user.lastResetRequest = now;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token to user model (valid for 1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    // Secure Detection: Prioritize ENV variable (Safe), fallback to Host header (Auto)
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = envUrl ? envUrl.replace(/\/$/, "") : `${protocol}://${host}`;
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;
    
    // Send Email if transporter is configured
    if (transporter && SMTP_FROM) {
      await transporter.sendMail({
        from: `"Parle Security" <${SMTP_FROM}>`,
        to: user.email,
        subject: "Security Protocol: Password Reset Request",
        html: getResetPasswordTemplate(resetUrl, user.name),
      });
    } else {
      console.warn("SMTP not configured. Reset Link (dev only):", resetUrl);
    }

    return NextResponse.json({ 
      message: "If an account exists, a password reset link has been created."
    }, { status: 200 });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
