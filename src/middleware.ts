import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.delete({ name, ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  

  // 1. DASHBOARD IS PUBLIC (It handles its own "Logged In" vs "Logged Out" view)
  const isPublicPage = pathname === '/' || 
                       pathname.startsWith('/login') || 
                       pathname.startsWith('/register') ||
                       pathname.startsWith('/dashboard') || 
                       pathname.startsWith('/auth')

  const isApiRoute = pathname.startsWith('/api')

  // 2. PROTECT EVERYTHING ELSE (Settings, Profile, Documents, etc.)
  if (!isPublicPage && !user) {

    //let APIs through
    if (isApiRoute) {
    return response 
  }


    // If they try to go to /settings but aren't logged in, send them to dashboard
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 3. AUTO-REDIRECT LOGGED-IN USERS (Optional)
  // If they are logged in and try to hit /login, send them to /dashboard
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// 4. The Matcher (Outside the function)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}