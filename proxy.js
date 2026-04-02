// proxy.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get authentication from cookies
  const isAuthenticated = request.cookies.get('is_authenticated')?.value === 'true';
  const userRole = request.cookies.get('user_role')?.value;
  const path = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  const isPublicRoute = path === '/' || 
                       path === '/login' || 
                       path === '/admin-verify-otp' ||
                       path === '/verify-otp' || 
                       path === '/election-result' ||
                       path.startsWith('/_next') ||
                       path.startsWith('/api') ||
                       path.startsWith('/images');
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }
  
  // Role-based access control
  const isAdminRoute = path.startsWith('/admin');
  const isVoterRoute = path.startsWith('/voter');
  
  // Admin routes should only be accessible by admin roles
  if (isAdminRoute && userRole !== 'admin' && userRole !== 'electoral_commission' && userRole !== 'dean') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  // Voter routes should only be accessible by voters
  if (isVoterRoute && userRole !== 'voter') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/voter/:path*',
    '/login',
    '/admin-verify-otp',
    '/verify-otp',
    '/election-result'
  ],
};