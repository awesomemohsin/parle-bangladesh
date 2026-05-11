import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { Admin } from "@/lib/models";
import { logAdminActivity } from "@/lib/activity";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) return NextResponse.json({ error: "Forbidden. Authority Level 4 required." }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const user = await Admin.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (body.role) {
      // 1. IMMUTABILITY: If the target user is already an OWNER, their role cannot be changed.
      if (user.role === ROLES.OWNER && body.role !== ROLES.OWNER) {
        return NextResponse.json({ 
          error: "Forbidden: The OWNER role is immutable and cannot be demoted." 
        }, { status: 403 });
      }

      const allowedRoles = ["admin", "customer", "moderator"];
      
      // Only an OWNER can promote someone to SUPER_ADMIN
      if (currentUser.role === ROLES.OWNER) {
        allowedRoles.push(ROLES.SUPER_ADMIN);

        // 2. UNIQUENESS: Only allow setting OWNER if no other owner exists (or if it's the same person)
        if (body.role === ROLES.OWNER) {
          const existingOwner = await Admin.findOne({ role: ROLES.OWNER });
          if (existingOwner && existingOwner._id.toString() !== id) {
            return NextResponse.json({ 
              error: "Forbidden: A system OWNER already exists. Only one OWNER is permitted." 
            }, { status: 403 });
          }
          allowedRoles.push(ROLES.OWNER);
        }
      }

      if (!allowedRoles.includes(body.role)) {
        return NextResponse.json({ 
          error: `Forbidden: You do not have authority to assign the '${body.role}' role.` 
        }, { status: 403 });
      }
      user.role = body.role;
    }

    if (body.status) {
      if (!["active", "disabled"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      user.status = body.status;
    }

    if (body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: "Password must be >= 6 chars" }, { status: 400 });
      user.password = hashPassword(body.password);
    }

    if (body.name) user.name = body.name;

    await user.save();
    const updated = user.toObject() as any;
    delete updated.password;
    updated.id = updated._id.toString();

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) return NextResponse.json({ error: "Forbidden. Authority Level 4 required." }, { status: 403 });

    const { id } = await params;
    
    const user = await Admin.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Hierarchy Protections:
    // 1. Superadmin cannot delete self
    if (currentUser.role === ROLES.SUPER_ADMIN && currentUser.id === id) {
      return NextResponse.json({ error: "Superadmin cannot delete themselves. Use another Superadmin account or Owner." }, { status: 403 });
    }
    // 2. Superadmin cannot delete other superadmins
    if (currentUser.role === ROLES.SUPER_ADMIN && user.role === ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Superadmin cannot delete other Superadmins. Only Owner can perform this." }, { status: 403 });
    }
    // 3. Owners cannot be deleted except potentially by another owner/self (lock it down)
    if (user.role === ROLES.OWNER && currentUser.role !== ROLES.OWNER) {
      return NextResponse.json({ error: "Cannot delete Owner account." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const otpCode = searchParams.get("otp");

    // --- OTP VERIFICATION LOGIC ---
    const creator = await Admin.findById(currentUser.id);
    if (!creator) return NextResponse.json({ error: "Requester identity not found" }, { status: 404 });

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
          subject: "Security Authorization: Admin Account Deletion",
          html: getOTPTemplate(generatedOtp, creator.name || creator.email),
        });
      }

      return NextResponse.json({ 
        requireOtp: true, 
        message: "A security code has been sent to your email to authorize this deletion." 
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

    await Admin.findByIdAndDelete(id);

    // Log the deletion
    await logAdminActivity({
      adminEmail: currentUser.email,
      action: "delete_admin",
      targetId: id,
      targetName: user.name || user.email,
      details: `Permanently deleted administrative account: ${user.name} (${user.email})`
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
