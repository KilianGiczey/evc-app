import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface CookieOptions {
  name: string
  value: string
  path?: string
  domain?: string
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

function createCookieMethods(req: NextRequest, res: NextResponse) {
  return {
    get: (name: string) => req.cookies.get(name)?.value ?? null,
    set: (name: string, value: string, options?: CookieOptions) => {
      res.cookies.set(name, value, options)
    },
    remove: (name: string) => {
      res.cookies.delete(name)
    },
  }
}

export async function middleware(req: NextRequest) {
  try {
    // Create a response object that we can modify
    const res = NextResponse.next()
    
    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: createCookieMethods(req, res) }
    )

    // Refresh session if expired - required for Server Components
    const { data: { session }, error } = await supabase.auth.getSession()

    console.log('Middleware - Path:', req.nextUrl.pathname)
    console.log('Middleware - Has Session:', !!session)
    console.log('Middleware - Session Error:', error)

    // If there's no session, redirect to login
    if (!session) {
      console.log('Middleware - No session, redirecting to login')
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Return the response with the modified cookies
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, redirect to login
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/projects/:path*',
    '/auth/callback'
  ]
} 