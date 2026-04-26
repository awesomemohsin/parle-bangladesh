import { NextRequest, NextResponse } from "next/server";
import { getTokenFromCookie } from "@/lib/auth";
import connectDB from "@/lib/db";
import { RefreshToken } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const refreshToken = getTokenFromCookie(request.headers.get('cookie'), 'refresh_token');
    
    if (!refreshToken) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    // Check if this specific refresh token still exists in the database
    const session = await RefreshToken.findOne({ token: refreshToken });
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
