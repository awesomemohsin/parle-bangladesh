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
