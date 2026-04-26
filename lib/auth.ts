import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET || (JWT_SECRET + "_refresh");

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

export interface JWTPayload {
  id: string
  email: string
  name?: string
  role: 'customer' | 'admin' | 'moderator' | 'super_admin' | 'owner'
  sid?: string
  iat?: number
  exp?: number
  aud?: string
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'aud'>, isAdmin: boolean = false): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '30m',
    audience: isAdmin ? 'admin' : 'customer'
  })
}

export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'aud'>, isAdmin: boolean = false): string {
  return jwt.sign(payload, REFRESH_SECRET, { 
    expiresIn: isAdmin ? '24h' : '30d',
    audience: isAdmin ? 'admin_refresh' : 'customer_refresh'
  })
}

export function verifyToken(token: string, isAdmin: boolean = false): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { 
      audience: isAdmin ? 'admin' : 'customer' 
    }) as unknown as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

export function verifyRefreshToken(token: string, isAdmin: boolean = false): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, { 
      audience: isAdmin ? 'admin_refresh' : 'customer_refresh' 
    }) as unknown as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

export function getTokenFromCookie(cookieHeader: string | null, name: string = 'auth_token'): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith(`${name}=`))
  if (!authCookie) return null
  return authCookie.substring(`${name}=`.length)
}

export function setAuthCookie(token: string, name: string = 'auth_token', maxAge: number = 1800): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${name}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`
}

export function clearAuthCookie(name: string = 'auth_token'): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`
}

export function setAuthCookies(accessToken: string, refreshToken: string, response: any, isAdmin: boolean = false) {
  response.headers.append("Set-Cookie", setAuthCookie(accessToken, 'auth_token', 1800)); // 30m
  const refreshMaxAge = isAdmin ? 86400 : 30 * 24 * 60 * 60; // 24h vs 30d
  response.headers.append("Set-Cookie", setAuthCookie(refreshToken, 'refresh_token', refreshMaxAge));
}

export function getAuthFromRequest(request: NextRequest, isAdmin: boolean = false) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  if (!token) return null;
  return verifyToken(token, isAdmin);
}
