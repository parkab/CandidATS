import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getAccessTokenFromRequest(request: NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  const cookies = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .reduce<Record<string, string>>((acc, cookie) => {
      const [name, ...rest] = cookie.split('=')
      acc[name] = rest.join('=')
      return acc
    }, {})

  return cookies['sb-access-token'] ?? null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Early API exit
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  let user = null
  const accessToken = getAccessTokenFromRequest(request)

  if (accessToken && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
      if (!error && data.user) {
        user = data.user
      }
    } catch (error) {
      console.error('Middleware auth error:', error)
    }
  }

  const protectedRoutes = ['/profile', '/documents', '/settings', '/jobs']
  const publicAuthRoutes = ['/login', '/register', '/forgot-password', '/update-password']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = publicAuthRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}