import type { MetadataRoute } from 'next';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.co.uk';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/auth/', '/superadmin/', '/api/'],
      },
    ],
    sitemap: `https://${APP_DOMAIN}/sitemap.xml`,
  };
}
