import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPredefinedPage } from '../../../config/predefined-pages';
import { EntryListPage } from '../../../components/tenant/EntryListPage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, { next: { tags: [`tenant:${slug}`], revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

async function getEntries(tenantSlug: string, pageKey: string) {
  try {
    const res = await fetch(`${API_URL}/page-entries?pageKey=${pageKey}`, {
      headers: { 'x-tenant-id': tenantSlug },
      next: { tags: [`tenant:${tenantSlug}:entries`], revalidate: 60 },
    });
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  if (!tenant) return { title: 'Offers' };
  return {
    title: 'Offers & Deals',
    description: `Latest offers and deals at ${tenant.name}. Don't miss out on our special promotions.`,
    openGraph: {
      title: `Offers | ${tenant.name}`,
      description: `Latest offers and deals at ${tenant.name}.`,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary_large_image', title: `Offers | ${tenant.name}` },
  };
}

export default async function OffersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  if (!tenant) notFound();

  const pageDef = getPredefinedPage('offers')!;
  const entries = await getEntries(tenantSlug, 'offers');
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';

  return <EntryListPage pageDef={pageDef} entries={entries} primaryColor={primaryColor} />;
}
