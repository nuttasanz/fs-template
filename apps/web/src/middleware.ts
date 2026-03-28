import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

// Secure by default: every route requires a session cookie
// unless explicitly listed here.
const PUBLIC_PATHS = ['/login'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSid = request.cookies.has(SESSION_COOKIE_NAME);

  // Unauthenticated user hitting a protected route → redirect to login
  if (!isPublic(pathname) && !hasSid) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting a public auth page → redirect to dashboard
  if (isPublic(pathname) && hasSid) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude Next.js internals, static assets, and API proxy routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
