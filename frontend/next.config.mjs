/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        port: '',
        pathname: '/**',
      },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      // Azurite local dev emulator
      { protocol: 'http', hostname: '127.0.0.1', port: '10000', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '10000', pathname: '/**' },
    ],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com',
  },

  async rewrites() {
    return { beforeFiles: [] };
  },

  async headers() {
    return [
      // Security headers on all routes
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
      // Tenant home pages — CDN-cacheable for 5 min, but browsers must always revalidate
      {
        source: '/:tenant',
        headers: [
          { key: 'Cache-Control', value: 'public, no-cache, s-maxage=300' },
          { key: 'Vary', value: 'Host' },
        ],
      },
      // Menu — CDN-cacheable for 5 min
      {
        source: '/:tenant/menu',
        headers: [
          { key: 'Cache-Control', value: 'public, no-cache, s-maxage=300' },
          { key: 'Vary', value: 'Host' },
        ],
      },
      // Gallery — CDN-cacheable for 15 min
      {
        source: '/:tenant/gallery',
        headers: [
          { key: 'Cache-Control', value: 'public, no-cache, s-maxage=900' },
          { key: 'Vary', value: 'Host' },
        ],
      },
      // Contact & other tenant pages — CDN-cacheable for 1 hr
      {
        source: '/:tenant/:page',
        headers: [
          { key: 'Cache-Control', value: 'public, no-cache, s-maxage=3600' },
          { key: 'Vary', value: 'Host' },
        ],
      },
      // Dashboard & auth — never cache
      {
        source: '/dashboard/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/auth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      // API routes — no cache
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default nextConfig;
