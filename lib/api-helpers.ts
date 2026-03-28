import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JWTPayload, getTokenFromCookie } from './auth'
import { ROLES } from './constants'

export function jsonResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function getAuthUser(request: NextRequest): Promise<JWTPayload | null> {
  const token = getTokenFromCookie(request.headers.get('cookie'))
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return errorResponse('Unauthorized', 401)
  }
  return user
}

export async function requireRole(request: NextRequest, requiredRole: string | string[]) {
  const user = await getAuthUser(request)
  if (!user) {
    return errorResponse('Unauthorized', 401)
  }

  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  if (!requiredRoles.includes(user.role)) {
    return errorResponse('Forbidden', 403)
  }

  return user
}

export function isSuperAdmin(user: JWTPayload): boolean {
  return user.role === ROLES.SUPER_ADMIN
}

export function isAdmin(user: JWTPayload): boolean {
  return user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN
}

export function isModerator(user: JWTPayload): boolean {
  return user.role === ROLES.MODERATOR || isAdmin(user)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function validateRequired(value: any): boolean {
  return value !== null && value !== undefined && value !== ''
}
