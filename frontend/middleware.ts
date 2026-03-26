import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are exclusively for the main domain (not tenant subdomains)
const MAIN_DOMAIN_ROUTES = ['/dashboard', '/auth'];

export function middleware(request: NextRequest) {
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

  // Custom domain: forward hostname to backend for slug resolution, rewrite to a
  // placeholder tenant segment — the backend will resolve via X-Tenant-Domain header.
  if (isCustomDomain) {
    const newUrl = url.clone();
    // Use __custom__ as placeholder; backend resolves actual tenant from hostname
    if (!pathname.startsWith('/__custom__')) {
      newUrl.pathname = `/__custom__${pathname}`;
    }
    const response = NextResponse.rewrite(newUrl);
    response.headers.set('x-tenant-domain', hostname);
    return response;
  }

  // If there's a subdomain, rewrite to [tenant] route
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
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
