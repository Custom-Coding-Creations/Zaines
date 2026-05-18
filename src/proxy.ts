import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getCanonicalAuthOrigin(): URL | null {
  const raw = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!raw) return null;

  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

// Lightweight edge-compatible guard. The next-auth database session strategy
// cannot be verified in the Edge runtime (no Prisma). We gate on the presence
// of the session cookie; the actual admin routes re-verify with auth() on the
// server side, so this is defence-in-depth only.
export function proxy(req: NextRequest) {
  const isAuthRoute =
    req.nextUrl.pathname.startsWith('/auth') ||
    req.nextUrl.pathname.startsWith('/api/auth');
  const isVercelPreviewHost = req.nextUrl.hostname.endsWith('.vercel.app');

  const isCanonicalRedirectEnvironment =
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV !== 'preview' &&
    !isVercelPreviewHost;

  if (isAuthRoute && isCanonicalRedirectEnvironment) {
    const canonicalAuthOrigin = getCanonicalAuthOrigin();

    if (canonicalAuthOrigin && req.nextUrl.host !== canonicalAuthOrigin.host) {
      const redirectUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, canonicalAuthOrigin.origin);
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  const isAdminRoute =
    req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/api/admin');

  if (isAdminRoute) {
    const e2eBypassEnabled =
      process.env.PLAYWRIGHT_TEST === '1' && req.cookies.get('e2e-staff')?.value === '1';
    if (e2eBypassEnabled) {
      return NextResponse.next();
    }

    const sessionCookie =
      req.cookies.get('authjs.session-token') ??
      req.cookies.get('__Secure-authjs.session-token');

    if (!sessionCookie) {
      const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
      signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/auth/:path*', '/api/auth/:path*'],
};
