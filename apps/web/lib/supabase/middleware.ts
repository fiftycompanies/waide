// Supabase Middleware Client
// Use this for authentication middleware

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, skip auth middleware
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Middleware] Supabase credentials not configured');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define route types
  const protectedRoutes = ['/dashboard', '/campaigns', '/analytics', '/onboarding', '/settings', '/ops'];
  const authRoutes = ['/login', '/signup'];
  const publicRoutes = ['/', '/api'];

  const pathname = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith('/api/')
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isAuthRoute && user) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete('redirect');
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from home page to dashboard
  if (pathname === '/' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
