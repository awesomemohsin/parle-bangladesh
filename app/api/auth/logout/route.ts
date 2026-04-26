import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getTokenFromCookie } from "@/lib/auth";
import connectDB from "@/lib/db";
import { RefreshToken } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const refreshToken = getTokenFromCookie(request.headers.get("cookie"), 'refresh_token');
    
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    const response = NextResponse.json({ success: true });
    response.headers.append("Set-Cookie", clearAuthCookie('auth_token'));
    response.headers.append("Set-Cookie", clearAuthCookie('refresh_token'));
    return response;
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}
