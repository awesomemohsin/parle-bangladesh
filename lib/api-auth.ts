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

interface CacheEntry {
  tokenVersion: number;
  isValid: boolean;
  expiresAt: number;
}

const verifiedUserCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * DEEP VERIFICATION: Checks the tokenVersion against the database.
 * If the version doesn't match (e.g., after a promotion/demotion), it returns null.
 */
export async function getVerifiedAuthUser(
  request: NextRequest,
): Promise<JWTPayload | null> {
  const user = getAuthUserFromRequest(request);
  if (!user) return null;

  const cacheKey = `${user.id}:${user.tokenVersion || 0}`;
  const now = Date.now();
  const cached = verifiedUserCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.isValid ? user : null;
  }

  try {
    const { User, Admin } = await import("@/lib/models");
    
    // Check both collections since they are separate
    let dbUser = await User.findById(user.id).select("tokenVersion").lean();
    if (!dbUser) {
      dbUser = await Admin.findById(user.id).select("tokenVersion").lean();
    }
    
    const isValid = !!(dbUser && (dbUser.tokenVersion || 0) === (user.tokenVersion || 0));

    verifiedUserCache.set(cacheKey, {
      tokenVersion: user.tokenVersion || 0,
      isValid,
      expiresAt: now + CACHE_TTL_MS
    });

    // Clean up expired cache items if it grows large
    if (verifiedUserCache.size > 500) {
      for (const [k, v] of verifiedUserCache.entries()) {
        if (v.expiresAt < now) {
          verifiedUserCache.delete(k);
        }
      }
    }

    // If the user isn't found in either or the version doesn't match
    if (!isValid) {
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

/**
 * Resolves the effective user context.
 * If the authenticated user is a Sales Representative (SR) and provides the X-On-Behalf-Of header,
 * this returns the impersonated shop owner's context as 'user', and the SR's profile as 'srUser'.
 */
export async function getEffectiveUserContext(
  request: NextRequest,
): Promise<{ user: any; srUser: any | null } | null> {
  const user = await getVerifiedAuthUser(request);
  if (!user) return null;

  try {
    const { User, Admin } = await import("@/lib/models");
    
    // Load full user details
    let dbUser = await User.findById(user.id).lean() as any;
    if (!dbUser) {
      dbUser = await Admin.findById(user.id).lean() as any;
    }

    if (!dbUser) return null;

    const isAllowedToImpersonate = dbUser.isSR || ["super_admin", "admin", "moderator", "owner"].includes(dbUser.role);

    if (isAllowedToImpersonate) {
      const onBehalfOfHeader = request.headers.get("x-on-behalf-of");
      if (onBehalfOfHeader && onBehalfOfHeader !== "null" && onBehalfOfHeader !== "undefined") {
        let shopUser = await User.findById(onBehalfOfHeader).lean() as any;
        if (!shopUser) {
          shopUser = await Admin.findById(onBehalfOfHeader).lean() as any;
        }
        if (shopUser) {
          return {
            user: {
              id: shopUser._id.toString(),
              email: shopUser.email,
              name: shopUser.name,
              role: shopUser.role,
              customerType: shopUser.customerType || shopUser.role || "customer",
              flatDiscountPercent: shopUser.flatDiscountPercent,
              flatDiscountExpiresAt: shopUser.flatDiscountExpiresAt,
              isSR: !!shopUser.isSR,
              referredBySR: shopUser.referredBySR,
              isRetailerApproved: shopUser.isRetailerApproved,
              dueBalance: (shopUser.walletBalance || 0) < 0 ? Math.abs(shopUser.walletBalance) : 0,
              creditLimit: shopUser.creditLimit,
              walletBalance: (shopUser.walletBalance || 0) > 0 ? shopUser.walletBalance : 0,
              mobile: shopUser.mobile,
            },
            srUser: {
              id: dbUser._id.toString(),
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
            },
          };
        }
      }
    }

    return {
      user: {
        id: dbUser._id.toString(),
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        customerType: dbUser.customerType || dbUser.role || "customer",
        flatDiscountPercent: dbUser.flatDiscountPercent,
        flatDiscountExpiresAt: dbUser.flatDiscountExpiresAt,
        isSR: dbUser.isSR,
        referredBySR: dbUser.referredBySR,
        isRetailerApproved: dbUser.isRetailerApproved,
        dueBalance: (dbUser.walletBalance || 0) < 0 ? Math.abs(dbUser.walletBalance) : 0,
        creditLimit: dbUser.creditLimit,
        walletBalance: (dbUser.walletBalance || 0) > 0 ? dbUser.walletBalance : 0,
        mobile: dbUser.mobile,
      },
      srUser: null,
    };
  } catch (error) {
    console.error("Error in getEffectiveUserContext:", error);
    return null;
  }
}
