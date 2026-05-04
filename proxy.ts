import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter (per instance)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 100 // 100 requests per minute

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
  const path = request.nextUrl.pathname

  // Security Headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: https://va.vercel-scripts.com; frame-src 'self' https://www.google.com;")

  // Rate Limiting for Auth and Admin APIs
  if (path.startsWith('/api/auth') || path.startsWith('/api/admin') || path.startsWith('/api/users')) {
    const now = Date.now()
    const rateLimitKey = `${ip}:${path}`
    const rateLimit = rateLimitMap.get(rateLimitKey)

    if (!rateLimit || (now - rateLimit.lastReset) > RATE_LIMIT_WINDOW) {
      rateLimitMap.set(rateLimitKey, { count: 1, lastReset: now })
    } else {
      rateLimit.count++
      if (rateLimit.count > MAX_REQUESTS) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please slow down.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
