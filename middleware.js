// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Protect admin routes
  if (path.startsWith('/admin')) {
    // Get admin session from cookies
    const adminSessionCookie = request.cookies.get('admin_session')?.value;
    const userRole = request.cookies.get('user_role')?.value;
    
    let isAdmin = false;
    
    if (adminSessionCookie) {
      try {
        const session = JSON.parse(decodeURIComponent(adminSessionCookie));
        // Check if session is still valid
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          isAdmin = true;
        }
      } catch (e) {
        console.error('Error parsing admin session:', e);
      }
    }
    
    // Also check user_role as fallback
    if (!isAdmin && userRole === 'admin') {
      isAdmin = true;
    }
    
    if (!isAdmin) {
      const url = new URL('/', request.url);
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};