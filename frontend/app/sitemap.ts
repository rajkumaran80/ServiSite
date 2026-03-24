import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.co.uk';

async function getAllTenants(): Promise<{ slug: string; updatedAt: string; themeSettings: any }[]> {
  try {
    const res = await fetch(`${API_URL}/tenant`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenants = await getAllTenants();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `https://${APP_DOMAIN}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];

  const tenantPages: MetadataRoute.Sitemap = tenants.flatMap((tenant) => {
    const base = `https://${tenant.slug}.${APP_DOMAIN}`;
    const navPages = tenant.themeSettings?.navPages ?? {};
    const updated = new Date(tenant.updatedAt);

    const pages: MetadataRoute.Sitemap = [
      { url: base, lastModified: updated, changeFrequency: 'weekly', priority: 0.9 },
    ];

    if (navPages.menu !== false) {
      pages.push({ url: `${base}/menu`, lastModified: updated, changeFrequency: 'daily', priority: 0.8 });
    }
    if (navPages.gallery) {
      pages.push({ url: `${base}/gallery`, lastModified: updated, changeFrequency: 'weekly', priority: 0.6 });
    }
    if (navPages.contact !== false) {
      pages.push({ url: `${base}/contact`, lastModified: updated, changeFrequency: 'monthly', priority: 0.7 });
    }
    if (navPages.events) {
      pages.push({ url: `${base}/events`, lastModified: updated, changeFrequency: 'weekly', priority: 0.7 });
    }
    if (navPages.about) {
      pages.push({ url: `${base}/about`, lastModified: updated, changeFrequency: 'monthly', priority: 0.5 });
    }
    if (navPages['dj-nights']) {
      pages.push({ url: `${base}/dj-nights`, lastModified: updated, changeFrequency: 'weekly', priority: 0.7 });
    }
    if (navPages.offers) {
      pages.push({ url: `${base}/offers`, lastModified: updated, changeFrequency: 'weekly', priority: 0.7 });
    }

    return pages;
  });

  return [...staticPages, ...tenantPages];
}
