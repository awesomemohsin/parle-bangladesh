import { NextRequest, NextResponse } from "next/server";
import { getVerifiedAuthUser } from "@/lib/api-auth";
import connectDB from "@/lib/db";
import { User, Admin } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Use DEEP VERIFICATION (checks tokenVersion)
    const user = await getVerifiedAuthUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized (Session Expired)" }, { status: 401 });
    }

    // Check both collections for the profile data
    let dbUser = await User.findById(user.id).select("-password").lean();
    if (!dbUser) {
      dbUser = await Admin.findById(user.id).select("-password").lean();
    }

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Convert _id to id for frontend consistency
    const sanitizedUser = {
      ...dbUser,
      id: dbUser._id.toString(),
      _id: undefined,
      __v: undefined,
    };

    return NextResponse.json({ user: sanitizedUser });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
