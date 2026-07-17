import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value;
  const session = token ? await verifyToken(token) : null;

  // 1. Guard for /admin routes
  if (pathname.startsWith('/admin')) {
    if (!session) {
      // Redirect to login with next url param
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!session.isActive) {
      // Deactivated account
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }

    // Role-based restrict: Only superusers can manage franchises
    if (pathname.startsWith('/admin/franchises') && !session.isSuperuser) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // 2. Redirect logged-in users away from /login
  if (pathname === '/login') {
    if (session && session.isActive) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
