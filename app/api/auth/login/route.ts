import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/schemas";
import { generateToken, setAuthCookie } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";
// Keep hashPassword imported if someone wants to use old data-store, but we can do it locally:
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const identifier = parsed.data.email.trim().toLowerCase();
    const passwordHash = hashPassword(parsed.data.password);
    
    // Extract IP and User-Agent for audit and security
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown IP";
    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    
    // Check in User collection first
    let user = await User.findOne({ 
      $or: [{ email: identifier }, { mobile: identifier }]
    });
    
    // If not found, check in Admin collection
    if (!user) {
      user = await Admin.findOne({ 
        $or: [{ email: identifier }, { mobile: identifier }]
      });
    }

    const loginType = body.loginType;

    if (!user) {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

    if (loginType === "customer" && user.role !== "customer") {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

    // Check if account is temporarily locked (Brute-Force Protection)
    if (user.lockUntil && user.lockUntil > new Date()) {
      return NextResponse.json({ 
        error: `Account locked due to multiple failed attempts. Try again later.` 
      }, { status: 429 });
    }

    // Validate Password and Status
    if (user.password !== passwordHash || user.status === "disabled") {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await user.save();
      
      // Log failed attempt
      const { LoginHistory } = await import("@/lib/models");
      await LoginHistory.create({ email: user.email, role: user.role, ipAddress, userAgent, status: "failed" });

      return NextResponse.json(
        { error: user.status === "disabled" ? "Account disabled" : "Incorrect email or password" },
        { status: 401 }
      );
    }

    // Password is correct. Reset failed attempts.
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    
    // If user is Admin, trigger 2FA OTP (Only for Super Admin and Owner)
    const adminRoles = ["super_admin", "owner"];
    if (adminRoles.includes(user.role)) {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.otpCode = otpCode;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // Valid for 10 mins
      await user.save();

      // Log OTP request
      const { LoginHistory } = await import("@/lib/models");
      await LoginHistory.create({ email: user.email, role: user.role, ipAddress, userAgent, status: "otp_requested" });

      // Send OTP Email
      const { transporter, SMTP_FROM } = await import("@/lib/mail");
      if (transporter && SMTP_FROM) {
        await transporter.sendMail({
          from: `"Parle Security" <${SMTP_FROM}>`,
          to: user.email,
          subject: "Your Admin Login OTP",
          html: `
            <h3>Admin Login Attempt</h3>
            <p>Your authorization code is: <strong style="font-size: 24px;">${otpCode}</strong></p>
            <p>This code expires in 10 minutes.</p>
            <br/>
            <p style="font-size: 12px; color: gray;"><strong>Security Info:</strong><br/>IP: ${ipAddress}<br/>Device: ${userAgent}</p>
          `,
        });
      }

      return NextResponse.json({ 
        status: "otp_required", 
        email: user.email,
        message: "Authorization code sent to your email" 
      });
    }

    // Normal customer login (No OTP required)
    await user.save();
    
    const { LoginHistory } = await import("@/lib/models");
    await LoginHistory.create({ email: user.email, role: user.role, ipAddress, userAgent, status: "success" });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.headers.set("Set-Cookie", setAuthCookie(token));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
