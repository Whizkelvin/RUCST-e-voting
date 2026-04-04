// proxy.js
import { NextResponse } from 'next/server';

export function proxy(request) {
  // Get authentication from cookies only (not localStorage)
  const isAuthenticated = request.cookies.get('is_authenticated')?.value === 'true';
  const path = request.nextUrl.pathname;
  
  // Get the redirect URL from the query params
  const redirectUrl = request.nextUrl.searchParams.get('redirect') || '';
  
  // Define public routes (no authentication required)
  const isPublicRoute = path === '/' || 
                       path === '/login' || 
                       path === '/verify-otp' || 
                       path === '/election-result' ||
                       path === '/admin-verify-otp' ||
                       path.startsWith('/_next') ||
                       path.startsWith('/api');
  
  // ⭐ FIX: Also allow access to admin OTP verification without auth
  const isAdminOtpRoute = path === '/admin/admin-verify-otp';
  
  // If it's a public route OR admin OTP page, allow access
  if (isPublicRoute || isAdminOtpRoute) {
    return NextResponse.next();
  }
  
  // Protect admin routes (except OTP verification)
  if (path.startsWith('/admin') && !isAuthenticated) {
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
    '/verify-otp',
    '/election-result',
    '/admin/admin-verify-otp',  // Add this explicitly
  ],
};