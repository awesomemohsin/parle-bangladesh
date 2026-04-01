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
      if (!["admin", "customer", "moderator", "super_admin", "owner"].includes(body.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
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
