import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import type { GalleryImage } from '../../../types/tenant.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      next: { tags: [`tenant:${slug}`], revalidate: 1800 },
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
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-500 mt-2">A glimpse into our world</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {images.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-semibold text-gray-700">No photos yet</h2>
            <p className="text-gray-500 mt-2">Check back soon for photos!</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="break-inside-avoid bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="relative overflow-hidden">
                  <Image
                    src={image.url}
                    alt={image.caption || `${tenant.name} gallery photo`}
                    width={600}
                    height={400}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ height: 'auto' }}
                  />
                </div>
                {image.caption && (
                  <div className="p-3">
                    <p className="text-sm text-gray-600">{image.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
