import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ─── Role → Default Landing Page ─────────────────────────────────────────────
const ROLE_REDIRECT: Record<string, string> = {
  SUPER_ADMIN: '/super-admin',
  ADMIN: '/admin',
  THEATER_MANAGER: '/theatre',
  USER: '/',
  SCANNER_DEVICE: '/scanner',
};

// ─── Route → Required Role(s) ────────────────────────────────────────────────
const ROUTE_GUARDS: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/super-admin', roles: ['SUPER_ADMIN'] },
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/theatre', roles: ['THEATER_MANAGER'] },
  { prefix: '/scanner', roles: ['SCANNER_DEVICE'] },
];

// ─── Public paths (no auth needed) ───────────────────────────────────────────
const PUBLIC_PATHS = ['/login', '/signup', '/otp', '/_next', '/favicon', '/api'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      sub: string;
      role: string;
      tenantId?: string;
      tenantSlug?: string;
    };
  } catch {
    return null;
  }
}

/**
 * Lightweight JWT payload decode — NO signature verification.
 *
 * Used ONLY for the /login → portal redirect decision because:
 *  1. We only need the `role` field, not cryptographic proof.
 *  2. If JWT_SECRET is misconfigured in .env.local, verifyToken() fails and
 *     authenticated users are stuck seeing the login page.
 *  3. Security is preserved: protected routes still call verifyToken() which
 *     DOES verify the signature. Sending someone to /theatre with a fake role
 *     cookie just gets them rejected by the THEATER_MANAGER route guard.
 */
function decodeJwtRole(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64 → JSON
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Already-authenticated guard for /login ──────────────────────────────
  // Must run BEFORE the public allow-list so we can redirect logged-in users
  // away from the login page without giving them a chance to render it.
  if (pathname === '/login') {
    const existingToken = request.cookies.get('access_token')?.value;
    if (existingToken) {
      // Step 1: Decode role WITHOUT needing the secret (redirect only needs the role).
      // Step 2: Verify the token hasn't expired (requires secret from .env.local).
      // Both steps must pass to redirect — this prevents redirect on expired tokens.
      const role = decodeJwtRole(existingToken);
      const verified = role ? await verifyToken(existingToken) : null;

      if (role && verified) {
        const home = ROLE_REDIRECT[role] ?? '/';
        if (home !== '/login') {
          return NextResponse.redirect(new URL(home, request.url));
        }
      }
      // Invalid, expired, or unverifiable token → let them log in again
    }
    // No token — render /login normally
    return NextResponse.next();
  }

  // Allow all other public paths through
  if (isPublic(pathname)) {
    return NextResponse.next();
  }



  // Extract JWT from cookie (SSR-safe) or Authorization header
  const tokenFromCookie = request.cookies.get('access_token')?.value;
  const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    // Not authenticated — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Invalid token — clear and redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('access_token');
    return response;
  }

  const { role, tenantId, tenantSlug } = payload;

  // ─── Check route guards ─────────────────────────────────────────────────────
  for (const guard of ROUTE_GUARDS) {
    if (pathname.startsWith(guard.prefix)) {
      if (!guard.roles.includes(role)) {
        // Wrong role: redirect to the correct portal
        const correctPortal = ROLE_REDIRECT[role] || '/';
        return NextResponse.redirect(new URL(correctPortal, request.url));
      }

      // TENANT_ADMIN: enforce tenant context (not for SUPER_ADMIN)
      if (role === 'ADMIN' && !tenantId && !tenantSlug) {
        return NextResponse.redirect(new URL('/login?error=no_tenant', request.url));
      }

      break; // Route matched and role is valid
    }
  }

  // ─── Forward tenant context in headers for SSR ──────────────────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', role);
  if (tenantId) requestHeaders.set('x-tenant-id', tenantId);
  if (tenantSlug) requestHeaders.set('x-tenant-slug', tenantSlug);
  if (role === 'SUPER_ADMIN') requestHeaders.set('x-bypass-rls', 'true');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
