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
    
    // Login Success
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

    response.headers.set("Set-Cookie", setAuthCookie(token, 'token', 86400 * 7));
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
