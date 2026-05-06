import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  // Clear the auth cookie
  response.headers.set("Set-Cookie", clearAuthCookie('token'));
  
  return response;
}
