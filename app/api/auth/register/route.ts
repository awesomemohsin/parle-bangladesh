import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/schemas";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { hashPassword, readUsers, writeUsers } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const users = readUsers();
    const email = parsed.data.email.toLowerCase();

    const exists = users.some((u) => u.email.toLowerCase() === email);
    if (exists) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const user = {
      id: `user-${Date.now()}`,
      email,
      password: hashPassword(parsed.data.password),
      name: parsed.data.name,
      role: "customer" as const,
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

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.headers.set("Set-Cookie", setAuthCookie(token));
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
