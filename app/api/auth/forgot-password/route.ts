import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { Customer, Admin } from "@/lib/models";

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

    // In a real application, you would send an email here using nodemailer, sendgrid, etc.
    // For this demonstration, we'll log it to console or return it in development
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    console.log(`[PASSWORD RESET LOG]: URL -> ${resetUrl}`);

    return NextResponse.json({ 
      message: "If an account exists, a password reset link has been created.",
      // Adding for easy testing without email setup:
      debug_url: process.env.NODE_ENV !== "production" ? resetUrl : undefined
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
