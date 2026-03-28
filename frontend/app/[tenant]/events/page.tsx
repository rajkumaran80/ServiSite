import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPredefinedPage, resolveNavPages } from '../../../config/predefined-pages';
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

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.tenant);
  if (!tenant) return { title: 'Events' };
  return {
    title: 'Special Events',
    description: `Upcoming special events at ${tenant.name}. See dates, times and details.`,
    openGraph: {
      title: `Special Events | ${tenant.name}`,
      description: `Upcoming special events at ${tenant.name}.`,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary_large_image', title: `Special Events | ${tenant.name}` },
  };
}

export default async function EventsPage({ params }: { params: { tenant: string } }) {
  const tenant = await getTenant(params.tenant);
  if (!tenant) notFound();

  const navPages = resolveNavPages(tenant.themeSettings?.navPages);
  if (!navPages['events']) notFound();

  const pageDef = getPredefinedPage('events')!;
  const entries = await getEntries(params.tenant, 'events');
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';

  return <EntryListPage pageDef={pageDef} entries={entries} primaryColor={primaryColor} />;
}
