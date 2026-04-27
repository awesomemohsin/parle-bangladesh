import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/api-helpers";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Admin } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await Admin.find({ role: { $ne: ROLES.OWNER } }, { password: 0 }).lean();
    return NextResponse.json({ users: users.map((u: any) => ({ ...u, id: u._id.toString() })) });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) {
      return NextResponse.json({ error: "Access denied. Authority Level 4 required." }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const role = body.role === "moderator" ? "moderator" : "admin";
    const name = String(body.name || email.split("@")[0] || "Admin User");
    const otpCode = body.otpCode;

    // --- OTP VERIFICATION LOGIC ---
    const { Admin: AdminModel } = require("@/lib/models");
    const creator = await AdminModel.findById(currentUser.id);
    if (!creator) return NextResponse.json({ error: "Creator identity not found" }, { status: 404 });

    if (!otpCode) {
      // Step 1: Generate and send OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      creator.otpCode = generatedOtp;
      creator.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await creator.save();

      const { transporter, getOTPTemplate, SMTP_FROM } = require("@/lib/mail");
      if (transporter && SMTP_FROM) {
        await transporter.sendMail({
          from: `"Parle Security" <${SMTP_FROM}>`,
          to: creator.email,
          subject: "Security Authorization: New Admin Creation",
          html: getOTPTemplate(generatedOtp, creator.name || creator.email),
        });
      }

      return NextResponse.json({ 
        requireOtp: true, 
        message: "A security code has been sent to your email to authorize this action." 
      }, { status: 200 });
    }

    // Step 2: Verify OTP
    if (creator.otpCode !== otpCode || !creator.otpExpires || creator.otpExpires < new Date()) {
      return NextResponse.json({ error: "Invalid or expired authorization code" }, { status: 401 });
    }

    // OTP is valid, clear it and proceed
    creator.otpCode = undefined;
    creator.otpExpires = undefined;
    await creator.save();
    // --- END OTP LOGIC ---

    if (!validateEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const exists = await Admin.findOne({ email });
    if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const user = new Admin({ email, password: hashPassword(password), name, role, status: "active", mobile: body.mobile || "01000000000" });
    await user.save();

    // Log administrative activity
    await logAdminActivity({
      adminEmail: currentUser.email,
      action: "create_admin",
      targetId: user._id.toString(),
      targetName: user.name,
      details: `Created new ${user.role}: ${user.name} (${user.email})`
    });

    const result = user.toObject() as any;
    delete result.password;
    result.id = result._id.toString();

    return NextResponse.json({ user: result }, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
