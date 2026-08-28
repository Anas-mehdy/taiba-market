import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static Next.js assets, public images, and favicons - allow directly
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp')
  ) {
    return NextResponse.next();
  }

  // 2. Admin Login Page - allow directly
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // 3. Admin Routes & Admin APIs (/admin/* and /api/admin/*)
  // Protected by admin_session cookie
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminSession = request.cookies.get('admin_session');

    if (!adminSession || adminSession.value !== 'authenticated') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized admin access' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 4. All Store & Public routes are open for all customers
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
