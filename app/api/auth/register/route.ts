import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/schemas";
import { generateToken, generateRefreshToken, setAuthCookies } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User, RefreshToken } from "@/lib/models";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();

    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const user = new User({
      email,
      password: hashPassword(parsed.data.password),
      name: parsed.data.name,
      role: "customer",
      status: "active",
    });

    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    }, false);

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    }, false);

    // Save refresh token in DB
    await RefreshToken.create({
      userId: user._id.toString(),
      token: refreshToken,
      role: user.role,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30d for customers
    });

    const response = NextResponse.json({
      token,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    setAuthCookies(token, refreshToken, response, false);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
