import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

 //early api exit
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
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
          // Re-syncing the response ensures no "lag" in session state
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

  // Only call this for non-API routes
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicPage = pathname === '/' || 
                       pathname.startsWith('/login') || 
                       pathname.startsWith('/register') ||
                       pathname.startsWith('/dashboard') || 
                       pathname.startsWith('/auth')

  // UI Protection Logic
 if (!isPublicPage && !user) {
  const redirectUrl = new URL('/dashboard', request.url)
  redirectUrl.searchParams.set('next', pathname)
  
  // FIX: Create the redirect, then copy the cookies from our 'response' object
  const redirectResponse = NextResponse.redirect(redirectUrl)
  
  // Copy every cookie set by Supabase (like refreshed tokens) onto the redirect
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return redirectResponse
}

// 3. AUTO-REDIRECT LOGGED-IN USERS
if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
  const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
  
  // Same fix: ensure refreshed tokens aren't lost during the bounce
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return redirectResponse
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
//testgithubpleasework