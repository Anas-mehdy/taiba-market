import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

// In-memory cache for PIN configuration to avoid hitting the database on every page request
let cachedConfig: { enabled: boolean; version: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds cache

const PIN_SECRET = process.env.STORE_PIN_SECRET || 'tayba-market-pin-secret-key-2026-safe-secure-token';

function verifyToken(token: string | undefined | null, expectedVersion: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [tokenVersion, tokenSignature] = parts;

  if (tokenVersion !== expectedVersion) return false;

  try {
    const hmac = crypto.createHmac('sha256', PIN_SECRET);
    hmac.update(`tayba_session_v_${expectedVersion}`);
    const expectedSignature = hmac.digest('hex');
    if (tokenSignature.length !== expectedSignature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(tokenSignature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}

async function getPinConfig(): Promise<{ enabled: boolean; version: string }> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.fetchedAt < CACHE_TTL_MS) {
    return { enabled: cachedConfig.enabled, version: cachedConfig.version };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !apiKey || supabaseUrl.includes('placeholder')) {
      return { enabled: false, version: '1' };
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/settings?key=in.(store_pin_enabled,store_pin_version)&select=key,value`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const data: Array<{ key: string; value: string }> = await res.json();
      const map = data.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      const enabled = map['store_pin_enabled'] === 'true';
      const version = map['store_pin_version'] || '1';

      cachedConfig = { enabled, version, fetchedAt: now };
      return { enabled, version };
    }
  } catch (err) {
    console.error('Proxy failed to fetch pin config:', err);
  }

  // Fallback to previous cache or safe open default if fetch fails
  if (cachedConfig) {
    return { enabled: cachedConfig.enabled, version: cachedConfig.version };
  }
  return { enabled: false, version: '1' };
}

export default async function proxy(request: NextRequest) {
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
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico')
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

  // 4. Store PIN Auth APIs - allow directly
  if (pathname.startsWith('/api/store/auth/')) {
    return NextResponse.next();
  }

  // 5. Store Gate Verification (/access)
  const pinConfig = await getPinConfig();
  const storeToken = request.cookies.get('store_access_token');
  const hasValidAccess = storeToken && verifyToken(storeToken.value, pinConfig.version);

  if (pathname === '/access') {
    // If PIN is disabled or user is already verified, send them to store
    if (!pinConfig.enabled || hasValidAccess) {
      const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/';
      return NextResponse.redirect(new URL(returnUrl, request.url));
    }
    return NextResponse.next();
  }

  // 6. Public Store Protection
  // If PIN protection is enabled and visitor is not verified:
  if (pinConfig.enabled && !hasValidAccess) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Store PIN verification required' },
        { status: 401 }
      );
    }
    const accessUrl = new URL('/access', request.url);
    if (pathname !== '/') {
      accessUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(accessUrl);
  }

  // 7. Store routes open for verified or unprotected visitors
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
