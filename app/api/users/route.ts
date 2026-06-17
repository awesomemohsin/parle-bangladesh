import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/api-helpers";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Admin, User } from "@/lib/models";
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

    const admins = await Admin.find({ role: { $ne: ROLES.OWNER } }, { password: 0 }).lean();
    const srs = await User.find({ isSR: true }, { password: 0 }).lean();

    const merged = [
      ...admins.map((u: any) => ({
        id: u._id.toString(),
        email: u.email,
        mobile: u.mobile,
        role: u.role,
        createdAt: u.createdAt
      })),
      ...srs.map((u: any) => ({
        id: u._id.toString(),
        email: u.email,
        mobile: u.mobile,
        role: "sr", // virtual role for frontend response mapping
        createdAt: u.createdAt
      }))
    ];

    return NextResponse.json({ users: merged });
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
    const rawRole = String(body.role || "admin");
    const role = rawRole === "sr" ? "sr" : (rawRole === "moderator" ? "moderator" : "admin");
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
      console.log(`\n==================================================\n[SECURITY OTP] Generated Code: ${generatedOtp} for ${creator.email}\n==================================================\n`);
      if (transporter && SMTP_FROM) {
        try {
          await transporter.sendMail({
            from: `"Parle Security" <${SMTP_FROM}>`,
            to: creator.email,
            subject: "Security Authorization: New Admin Creation",
            html: getOTPTemplate(generatedOtp, creator.name || creator.email),
          });
        } catch (mailError) {
          console.error("[SECURITY OTP] Failed to send email, but logged to console:", mailError);
          // If not in development, rethrow the mail error to trigger 500 error
          if (process.env.NODE_ENV !== "development") {
            throw mailError;
          }
        }
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

    const adminExists = await Admin.findOne({ email });
    const userExists = await User.findOne({ email });

    if (role === "sr") {
      if (adminExists) {
        return NextResponse.json({ error: "Email already in use as Admin" }, { status: 409 });
      }
      
      if (userExists) {
        // Upgrade existing user to SR
        userExists.isSR = true;
        if (password) {
          userExists.password = hashPassword(password);
        }
        if (name) {
          userExists.name = name;
        }
        if (body.mobile) {
          userExists.mobile = body.mobile;
        }
        await userExists.save();

        await logAdminActivity({
          adminEmail: currentUser.email,
          action: "create_admin",
          targetId: userExists._id.toString(),
          targetName: userExists.name,
          details: `Upgraded existing user to Sales Representative: ${userExists.name} (${userExists.email})`
        });

        const result = userExists.toObject() as any;
        delete result.password;
        result.id = result._id.toString();
        result.role = "sr";

        return NextResponse.json({ user: result }, { status: 200 });
      }

      const user = new User({ 
        email, 
        password: hashPassword(password), 
        name, 
        role: "customer", 
        customerType: "customer",
        status: "active", 
        isSR: true,
        mobile: body.mobile || "01000000000" 
      });
      await user.save();

      // Log administrative activity
      await logAdminActivity({
        adminEmail: currentUser.email,
        action: "create_admin",
        targetId: user._id.toString(),
        targetName: user.name,
        details: `Created new Sales Representative: ${user.name} (${user.email})`
      });

      const result = user.toObject() as any;
      delete result.password;
      result.id = result._id.toString();
      result.role = "sr";

      return NextResponse.json({ user: result }, { status: 201 });
    } else {
      if (adminExists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
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
    }
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
