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
  forceAdmin: boolean = false
): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  const pathname = new URL(request.url).pathname;
  // Determine context: Admin routes or customer routes
  const isAdminRequest = forceAdmin || 
                         pathname.startsWith('/api/admin') || 
                         pathname.startsWith('/api/approvals') ||
                         request.headers.get('x-admin-context') === 'true';

  // Attempt verification with the intended audience
  let payload = verifyToken(token, isAdminRequest);
  
  // Security Layer: If an admin request is made with a customer token, payload will be null here.
  // We should NOT fallback to customer token if the route is strictly admin.
  if (isAdminRequest) return payload;

  // For general routes (like /api/orders), try customer first, then admin as fallback
  if (!payload) {
    payload = verifyToken(token, true);
  }
  
  return payload;
}

export function hasAnyRole(user: JWTPayload, roles: string[]): boolean {
  return roles.includes(user.role);
}
