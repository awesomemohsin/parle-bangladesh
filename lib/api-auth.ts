import { NextRequest } from "next/server";
import { getTokenFromCookie, JWTPayload, verifyToken } from "@/lib/auth";

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return getTokenFromCookie(request.headers.get("cookie"));
}

export function getAuthUserFromRequest(
  request: NextRequest,
): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export function hasAnyRole(user: JWTPayload, roles: string[]): boolean {
  return roles.includes(user.role);
}
