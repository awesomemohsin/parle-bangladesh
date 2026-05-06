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

/**
 * DEEP VERIFICATION: Checks the tokenVersion against the database.
 * If the version doesn't match (e.g., after a promotion/demotion), it returns null.
 */
export async function getVerifiedAuthUser(
  request: NextRequest,
): Promise<JWTPayload | null> {
  const user = getAuthUserFromRequest(request);
  if (!user) return null;

  try {
    const { User, Admin } = await import("@/lib/models");
    
    // Check both collections since they are separate
    let dbUser = await User.findById(user.id).select("tokenVersion").lean();
    if (!dbUser) {
      dbUser = await Admin.findById(user.id).select("tokenVersion").lean();
    }
    
    // If the user isn't found in either or the version doesn't match
    if (!dbUser || (dbUser.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      console.log(`[Auth] Session invalid for ${user.email}. DB: ${dbUser?.tokenVersion}, Token: ${user.tokenVersion}`);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

export function hasAnyRole(user: JWTPayload, roles: string[]): boolean {
  return roles.includes(user.role);
}
