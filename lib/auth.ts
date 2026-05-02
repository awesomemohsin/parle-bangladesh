import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not defined');
}

export interface JWTPayload {
  id: string
  email: string
  name?: string
  role: 'customer' | 'admin' | 'moderator' | 'super_admin' | 'owner'
  customerType?: 'retailer' | 'dealer'
  iat?: number
  exp?: number
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

export function getTokenFromCookie(cookieHeader: string | null, name: string = 'token'): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith(`${name}=`))
  if (!authCookie) return null
  return authCookie.substring(`${name}=`.length)
}

export function setAuthCookie(token: string, name: string = 'token', maxAge: number = 604800): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${name}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`
}

export function clearAuthCookie(name: string = 'token'): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`
}
