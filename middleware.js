// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for admin routes - let the layout handle auth
  if (path.startsWith('/admin')) {
    return NextResponse.next();
  }
  
  // Add other middleware logic here if needed for other routes
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'], // Only run on admin routes, but we're letting them through
};