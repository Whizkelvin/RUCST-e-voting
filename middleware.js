// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get authentication from cookies only (not localStorage)
  const isAuthenticated = request.cookies.get('is_authenticated')?.value === 'true';
  const path = request.nextUrl.pathname;
  
  // Get the redirect URL from the query params
  const redirectUrl = request.nextUrl.searchParams.get('redirect') || '';
  
  // Allow access to login page and public routes
  const isPublicRoute = path === '/' || 
                       path === '/login' || 
                       path === '/admin-verify-otp' ||  // Added admin-verify-otp
                       path === '/verify-otp' || 
                       path === '/election-result' ||
                       path.startsWith('/_next') ||
                       path.startsWith('/api');
  
  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Protect admin routes
  if (path.startsWith('/admin') && !isAuthenticated) {
    // Redirect to login with the original URL as redirect parameter
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }
  
  // Protect voter routes
  if (path.startsWith('/voter') && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/voter/:path*',
    '/login',
    '/admin-verify-otp',  // Added admin-verify-otp
    '/verify-otp',
    '/election-result'
  ],
};