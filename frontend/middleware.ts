import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are exclusively for the main domain (not tenant subdomains)
const MAIN_DOMAIN_ROUTES = ['/dashboard', '/auth'];

// In-memory cache for custom domain → slug resolution
// Middleware runs in the edge runtime — this persists for the lifetime of the worker
const domainCache = new Map<string, { slug: string; expiresAt: number }>();
const DOMAIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function middleware(request: NextRequest) {
  // X-Forwarded-Host is set by Azure Front Door to the original client hostname.
  // Fall back to Host when running locally without a proxy.
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';

  // Extract subdomain
  let subdomain: string | null = null;
  let isCustomDomain = false;

  // Handle production domain: {slug}.servisite.com
  if (hostname.endsWith(`.${appDomain}`)) {
    subdomain = hostname.replace(`.${appDomain}`, '');
  }
  // Handle local development: {slug}.localhost:3000
  else if (hostname.includes('.localhost')) {
    subdomain = hostname.split('.localhost')[0];
  }
  // Otherwise treat as a potential custom domain (e.g. pizzapalace.com)
  else if (hostname !== appDomain && hostname !== `www.${appDomain}` && !hostname.includes('localhost')) {
    isCustomDomain = true;
  }

  // Skip middleware for:
  // - Static files
  // - API routes
  // - Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files like favicon.ico, images etc.
  ) {
    return NextResponse.next();
  }

  // Custom domain: resolve hostname → tenant slug via backend, then rewrite to
  // the existing [tenant] routes so no code duplication is needed.
  if (isCustomDomain) {
    // Don't loop if we already rewrote to a tenant path
    if (pathname.startsWith('/__custom__')) {
      return NextResponse.next();
    }

    try {
      // Check in-memory cache first — avoids API call on every request
      const cached = domainCache.get(hostname);
      let slug: string | null = null;

      if (cached && cached.expiresAt > Date.now()) {
        slug = cached.slug;
      } else {
        const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const res = await fetch(`${apiUrl}/tenant/by-domain?domain=${encodeURIComponent(hostname)}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          slug = json?.data?.slug ?? null;
          if (slug) {
            domainCache.set(hostname, { slug, expiresAt: Date.now() + DOMAIN_CACHE_TTL });
          }
        }
      }

      if (slug) {
        const newUrl = url.clone();
        newUrl.pathname = `/${slug}${pathname === '/' ? '' : pathname}`;
        return NextResponse.rewrite(newUrl);
      }
    } catch {
      // fall through to 404
    }

    return NextResponse.next();
  }

  // If there's a subdomain, rewrite to [tenant] route
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    // Auth and dashboard routes pass through as-is — the dashboard is shared across
    // all tenants and accessed via subdomain with token auth (superadmin impersonation).
    if (
      pathname.startsWith('/auth/') || pathname === '/auth' ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/superadmin')
    ) {
      return NextResponse.next();
    }

    // Don't rewrite if already on a [tenant] path
    if (!pathname.startsWith('/[tenant]')) {
      const newUrl = url.clone();
      newUrl.pathname = `/${subdomain}${pathname}`;

      const response = NextResponse.rewrite(newUrl);
      // Pass the tenant slug as a header for server components to read
      response.headers.set('x-tenant-slug', subdomain);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
