import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are exclusively for the main domain (not tenant subdomains)
const MAIN_DOMAIN_ROUTES = ['/dashboard', '/auth'];

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';

  // Extract subdomain
  let subdomain: string | null = null;

  // Handle production domain: {slug}.servisite.com
  if (hostname.endsWith(`.${appDomain}`)) {
    subdomain = hostname.replace(`.${appDomain}`, '');
  }
  // Handle local development: {slug}.localhost:3000
  else if (hostname.includes('.localhost')) {
    subdomain = hostname.split('.localhost')[0];
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

  // Protect dashboard routes - redirect to login if no auth cookie
  if (pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('auth-token');
    if (!authCookie) {
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Protect superadmin routes
  if (pathname.startsWith('/superadmin') && !pathname.startsWith('/superadmin/login')) {
    const authCookie = request.cookies.get('auth-token');
    if (!authCookie) {
      url.pathname = '/superadmin/login';
      return NextResponse.redirect(url);
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
