import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/schemas";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { hashPassword, readUsers } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = hashPassword(parsed.data.password);
    const users = readUsers();

    const user = users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== passwordHash || user.status === "disabled") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
