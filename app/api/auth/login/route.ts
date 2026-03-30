import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/schemas";
import { generateToken, setAuthCookie } from "@/lib/auth";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";
// Keep hashPassword imported if someone wants to use old data-store, but we can do it locally:
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    const identifier = parsed.data.email.trim().toLowerCase();
    const passwordHash = hashPassword(parsed.data.password);
    
    // Check in User collection first (registered customers)
    let user = await User.findOne({ 
      $or: [{ email: identifier }, { mobile: identifier }]
    });
    
    // If not found, check in Admin collection
    if (!user) {
      user = await Admin.findOne({ 
        $or: [{ email: identifier }, { mobile: identifier }]
      });
    }
    
    // If user exists, but password mismatch or disabled
    if (!user || user.password !== passwordHash || user.status === "disabled") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
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
