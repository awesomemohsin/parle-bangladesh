import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { Admin, User } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const dbUser = await Admin.findById(user.id) || await User.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User identity not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: dbUser.name,
      email: dbUser.email,
      mobile: dbUser.mobile,
      role: dbUser.role
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
