import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'parle-ecommerce-secret-key-change-in-production'

export interface JWTPayload {
  id: string
  email: string
  name?: string
  role: 'customer' | 'admin' | 'moderator' | 'super_admin'
  iat?: number
  exp?: number
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded as JWTPayload
  } catch (error) {
    return null
  }
}

export function getTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith('auth_token='))
  if (!authCookie) return null
  return authCookie.substring('auth_token='.length)
}

export function setAuthCookie(token: string): string {
  return `auth_token=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax`
}

export function clearAuthCookie(): string {
  return 'auth_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
}
