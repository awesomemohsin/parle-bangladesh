import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Customer, Admin } from "@/lib/models";
import { transporter, getResetPasswordTemplate, SMTP_FROM } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    let user = await Customer.findOne({ email: emailLower });
    
    if (!user) {
      user = await Admin.findOne({ email: emailLower });
    }
    
    if (!user) {
      // Return success even if not found to prevent email enumeration
      return NextResponse.json({ message: "If an account exists, a password reset link has been created." }, { status: 200 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token to user model (valid for 1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
