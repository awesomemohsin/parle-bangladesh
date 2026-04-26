import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, generateToken, setAuthCookie, getTokenFromCookie } from "@/lib/auth";
import connectDB from "@/lib/db";
import { RefreshToken } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const refreshToken = getTokenFromCookie(request.headers.get("cookie"), 'refresh_token');

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    // Try verifying as admin first, then as customer
    let payload = verifyRefreshToken(refreshToken, true);
    let isAdmin = true;
    
    if (!payload) {
      payload = verifyRefreshToken(refreshToken, false);
      isAdmin = false;
    }

    if (!payload) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    // Revocation check: Ensure token exists in DB
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
       // Clear cookies if revoked
       const response = NextResponse.json({ error: "Session revoked" }, { status: 401 });
       response.headers.append("Set-Cookie", "auth_token=; Path=/; Max-Age=0");
       response.headers.append("Set-Cookie", "refresh_token=; Path=/; Max-Age=0");
       return response;
    }

    const accessToken = generateToken({
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    }, isAdmin);

    const response = NextResponse.json({
      token: accessToken,
      user: { id: payload.id, email: payload.email, name: payload.name, role: payload.role }
    });

    response.headers.set("Set-Cookie", setAuthCookie(accessToken, 'auth_token', 1800));
    return response;

  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
