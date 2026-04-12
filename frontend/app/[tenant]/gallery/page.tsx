import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { GalleryImage } from '../../../types/tenant.types';
import GalleryGrid from './GalleryGrid';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      next: { tags: [`tenant:${slug}`], revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch { return null; }
}

async function getGallery(slug: string): Promise<GalleryImage[]> {
  try {
    const res = await fetch(`${API_URL}/gallery`, {
      next: { tags: [`tenant:${slug}:gallery`], revalidate: 900 },
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.tenant);
  if (!tenant) return { title: 'Gallery' };
  return {
    title: 'Gallery',
    description: `Browse photos from ${tenant.name}. See our space, work and atmosphere.`,
    openGraph: {
      title: `Gallery | ${tenant.name}`,
      description: `Browse photos from ${tenant.name}.`,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary_large_image', title: `Gallery | ${tenant.name}` },
  };
}

export default async function GalleryPage({ params }: { params: { tenant: string } }) {
  const [tenant, images] = await Promise.all([
    getTenant(params.tenant),
    getGallery(params.tenant),
  ]);

  if (!tenant) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-500 mt-2">A glimpse into our world</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <GalleryGrid images={images} tenantName={tenant.name} />
      </div>
    </div>
  );
}
