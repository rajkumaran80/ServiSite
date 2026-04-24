import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SectionRenderer } from '../../../components/tenant/SectionRenderer';
import type { CmsPage } from '../../../types/page.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Reserved slugs handled by other pages
const RESERVED_SLUGS = ['menu', 'gallery', 'contact'];

async function getTenant(tenantSlug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${tenantSlug}`, { next: { tags: [`tenant:${tenantSlug}`], revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

async function getPage(tenantSlug: string, slug: string): Promise<CmsPage | null> {
  try {
    const res = await fetch(`${API_URL}/pages/${slug}`, {
      headers: { 'x-tenant-id': tenantSlug },
      next: { tags: [`tenant:${tenantSlug}:pages:${slug}`], revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>;
}): Promise<Metadata> {
  const { tenant: tenantSlug, slug } = await params;
  if (RESERVED_SLUGS.includes(slug)) return {};
  const tenant = await getTenant(tenantSlug);
  if (!tenant) return { title: 'Not Found' };
  const page = await getPage(tenantSlug, slug);
  if (!page) return { title: 'Not Found' };
  return { title: page.title };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ tenant: string; slug: string }>;
}) {
  const { tenant: tenantSlug, slug } = await params;
  
  // Let reserved slugs fall through to their own pages
  if (RESERVED_SLUGS.includes(slug)) {
    notFound();
  }

  const tenant = await getTenant(tenantSlug);
  if (!tenant) notFound();

  const page = await getPage(tenantSlug, slug);
  if (!page) notFound();

  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';
  const sortedSections = [...page.sections].sort((a, b) => a.order - b.order);

  return (
    <div>
      {sortedSections.map((section) => (
        <SectionRenderer key={section.id} section={section} primaryColor={primaryColor} />
      ))}
      {sortedSections.length === 0 && (
        <div className="min-h-[60vh] flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-xl font-medium">{page.title}</p>
            <p className="text-sm mt-2">This page has no content yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}
