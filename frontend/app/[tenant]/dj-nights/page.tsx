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
  if (!tenant) return { title: 'DJ Nights' };
  return {
    title: 'DJ Nights',
    description: `DJ nights and live music events at ${tenant.name}. Check upcoming dates and DJs.`,
    openGraph: {
      title: `DJ Nights | ${tenant.name}`,
      description: `DJ nights and live music events at ${tenant.name}.`,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary_large_image', title: `DJ Nights | ${tenant.name}` },
  };
}

export default async function DjNightsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  if (!tenant) notFound();

  const pageDef = getPredefinedPage('dj-nights')!;
  const entries = await getEntries(tenantSlug, 'dj-nights');
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';

  return <EntryListPage pageDef={pageDef} entries={entries} primaryColor={primaryColor} />;
}
