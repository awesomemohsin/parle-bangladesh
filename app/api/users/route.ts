import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/api-helpers";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import { ROLES } from "@/lib/constants";
import {
  hashPassword,
  normalizeRole,
  readUsers,
  writeUsers,
} from "@/lib/data-store";

export async function GET(request: NextRequest) {
  try {
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = readUsers().map(({ password, ...user }) => user);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getAuthUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const email = String(body.email || "")
      .toLowerCase()
      .trim();
    const password = String(body.password || "");
    const role = normalizeRole(String(body.role || "admin"));
    const name = String(body.name || email.split("@")[0] || "Admin User");

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const user = {
      id: `user-${Date.now()}`,
      email,
      password: hashPassword(password),
      name,
      role,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    };

    const saved = writeUsers([...users, user]);
    if (!saved) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    const { password: _password, ...safeUser } = user;
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
