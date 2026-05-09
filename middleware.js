// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;

  // Read cookies
  const isAuthenticated =
    request.cookies.get('is_authenticated')?.value === 'true';

  const userRole =
    request.cookies.get('user_role')?.value;

  // Normalize role (VERY IMPORTANT)
  const role = userRole?.trim()?.toLowerCase();

  // =========================
  // PUBLIC ROUTES
  // =========================
  const publicRoutes = [
    '/',
    '/login',
    '/verify-otp',
    '/admin-verify-otp',
    '/election-result',
    '/vote-process',
    '/nomination-success',
    '/candidate-nomination',
  ];

  const isPublicRoute =
    publicRoutes.includes(path) ||
    publicRoutes.some(route => path.startsWith(route)) ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/favicon.ico') ||
    path === '/' ||
    path === '';

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // =========================
  // ADMIN ROUTES
  // =========================
  if (path.startsWith('/admin')) {
    // Allow OTP page always
    if (path === '/admin-verify-otp') {
      return NextResponse.next();
    }

    // Not logged in - redirect to login
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }

    // Wrong role - redirect to home
    if (role !== 'admin' && role !== 'electoral_commission' && role !== 'ec' && role !== 'dean') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  // =========================
  // VOTER ROUTES
  // =========================
  if (path.startsWith('/voter') || path === '/vote') {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== 'voter') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  // =========================
  // VOTING ROUTES
  // =========================
  if (path === '/vote' || path.startsWith('/vote/')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // default allow
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*', 
    '/voter/:path*',
    '/vote/:path*',
    '/vote',
    '/admin-verify-otp'
  ],
};