import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";
import { generateToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, email, mobile, password } = body;

    if (!name || !email || !mobile || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const mobileRegex = /^01[3-9]\d{8}$/;
    if (!mobileRegex.test(mobile)) {
      return NextResponse.json({ error: "Invalid Bangladeshi mobile format" }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    
    // Check both User and Admin collections to prevent duplicates across roles
    const existingUser = await User.findOne({ 
      $or: [{ email: emailLower }, { mobile }]
    });
    const existingAdmin = await Admin.findOne({ 
      $or: [{ email: emailLower }, { mobile }]
    });
    
    if (existingUser || existingAdmin) {
      return NextResponse.json({ error: "Email or Mobile already in use" }, { status: 400 });
    }

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    const user = await User.create({
      name,
      email: emailLower,
      mobile,
      password: passwordHash,
      role: "customer", // Registered users are standard customers
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
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
      message: "Signup successful",
    }, { status: 201 });

    response.headers.set("Set-Cookie", setAuthCookie(token));
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

