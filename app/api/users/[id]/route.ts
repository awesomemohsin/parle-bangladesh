import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, hasAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import connectDB from "@/lib/db";
import { User } from "@/lib/models";
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
    if (currentUser.role === ROLES.OWNER) {
      return NextResponse.json({ error: "Restricted: Owner cannot update users directly." }, { status: 403 });
    }
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    const user = await User.findById(id);
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
    if (currentUser.role === ROLES.OWNER) {
      return NextResponse.json({ error: "Restricted: Owner cannot delete users directly." }, { status: 403 });
    }
    if (!hasAnyRole(currentUser, [ROLES.SUPER_ADMIN, ROLES.OWNER])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    
    // Prevent deletion of self or other super admins optionally?
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.role === ROLES.SUPER_ADMIN && currentUser.id !== id) {
       // logic could go here
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
