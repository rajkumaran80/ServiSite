import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      next: { tags: [`tenant:${slug}`], revalidate: 1800 },
    });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.tenant);
  if (!tenant) return { title: 'Menu' };
  const isRestaurantLike = ['RESTAURANT', 'CAFE'].includes(tenant.type);
  const label = isRestaurantLike ? 'Menu' : 'Services';
  return {
    title: label,
    description: `Browse the full ${label.toLowerCase()} of ${tenant.name}. See all items, prices and descriptions.`,
    openGraph: {
      title: `${label} | ${tenant.name}`,
      description: `Browse the full ${label.toLowerCase()} of ${tenant.name}.`,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary_large_image', title: `${label} | ${tenant.name}` },
  };
}

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
