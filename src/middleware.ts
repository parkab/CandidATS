import { NextResponse, type NextRequest } from 'next/server'
import { getAccessTokenFromRequest, supabaseAdmin } from '@/lib/supabase'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Early API exit
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const protectedRoutes = ['/profile', '/documents', '/settings', '/jobs']
  const authOnlyRoutes = ['/login', '/register']
  const passwordRoutes = ['/forgot-password', '/update-password']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthOnlyRoute = authOnlyRoutes.some(route => pathname.startsWith(route))

  // Only validate auth for protected and auth-only routes
  let user = null
  if ((isProtectedRoute || isAuthOnlyRoute) && supabaseAdmin) {
    const accessToken = getAccessTokenFromRequest(request)
    if (accessToken) {
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
        if (!error && data.user) {
          user = data.user
        }
      } catch (error) {
        console.error('Middleware auth error:', error)
      }
    }
  }

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthOnlyRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}