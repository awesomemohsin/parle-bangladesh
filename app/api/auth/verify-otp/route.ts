import { NextRequest, NextResponse } from "next/server";
import { generateToken, generateRefreshToken, setAuthCookies } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User, Admin, LoginHistory, RefreshToken } from "@/lib/models";
import { transporter, SMTP_FROM } from "@/lib/mail";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { email, otpCode } = body;

    if (!email || !otpCode) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const identifier = email.trim().toLowerCase();
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Unknown IP";
    const userAgent = request.headers.get("user-agent") || "Unknown Device";

    let user = await User.findOne({ email: identifier });
    if (!user) {
      user = await Admin.findOne({ email: identifier });
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return NextResponse.json({ error: "Account locked. Try again later." }, { status: 429 });
    }

    if (user.otpCode !== otpCode || !user.otpExpires || user.otpExpires < new Date()) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      await LoginHistory.create({ email: user.email, role: user.role, ipAddress, userAgent, status: "failed" });

      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    // OTP Valid
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Check last successful login to see if this is a new IP/Device
    const lastLogin = await LoginHistory.findOne({ email: user.email, status: "success" }).sort({ createdAt: -1 });

    await LoginHistory.create({ email: user.email, role: user.role, ipAddress, userAgent, status: "success" });

    // Send New Login Notification if it's a new IP or Device
    if (transporter && SMTP_FROM && (!lastLogin || lastLogin.ipAddress !== ipAddress || lastLogin.userAgent !== userAgent)) {
      await transporter.sendMail({
        from: `"Parle Security" <${SMTP_FROM}>`,
        to: user.email,
        subject: "Security Alert: New Login Detected",
        html: `
          <h3>New Login to your Admin Account</h3>
          <p>We detected a successful login to your account from a new IP address or device.</p>
          <br/>
          <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
          <p><strong>IP Address:</strong> ${ipAddress}</p>
          <p><strong>Device/Browser:</strong> ${userAgent}</p>
          <br/>
          <p>If this was you, you can ignore this email. If this wasn't you, please reset your password immediately and contact the system owner.</p>
        `,
      });
    }

    const isAdmin = ["admin", "moderator", "super_admin", "owner"].includes(user.role);

    // Save refresh token in DB for tracking and revocation
    const refreshTokenRecord = await RefreshToken.create({
      userId: user._id.toString(),
      email: user.email,
      token: "pending",
      role: user.role,
      expiresAt: new Date(Date.now() + (isAdmin ? 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000))
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      sid: refreshTokenRecord._id.toString()
    }, isAdmin);

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      sid: refreshTokenRecord._id.toString()
    }, isAdmin);

    // Update with real token
    refreshTokenRecord.token = refreshToken;
    await refreshTokenRecord.save();

    const response = NextResponse.json({
      token,
      refreshToken,
      user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role },
    });

    setAuthCookies(token, refreshToken, response, isAdmin);
    return response;

  } catch (error) {
    console.error("OTP Verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
