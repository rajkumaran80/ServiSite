import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import HeroSection from '../../components/tenant/HeroSection';
import MenuCard from '../../components/tenant/MenuCard';
import QRCodeDisplay from '../../components/tenant/QRCodeDisplay';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

async function getFeaturedItems(slug: string) {
  try {
    const res = await fetch(`${API_URL}/menu/items?available=true`, {
      next: { revalidate: 120 },
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).slice(0, 6); // Show first 6 featured items
  } catch {
    return [];
  }
}

export default async function TenantHomePage({
  params,
}: {
  params: { tenant: string };
}) {
  const [tenant, featuredItems] = await Promise.all([
    getTenant(params.tenant),
    getFeaturedItems(params.tenant),
  ]);

  if (!tenant) {
    notFound();
  }

  const publicUrl = `https://${tenant.slug}.${APP_DOMAIN}`;
  const tenantTypeLabel = {
    RESTAURANT: 'Restaurant',
    SALON: 'Salon',
    REPAIR_SHOP: 'Repair Shop',
    OTHER: 'Business',
  }[tenant.type] || 'Business';

  return (
    <div>
      {/* Hero Section */}
      <HeroSection tenant={tenant} />

      {/* Featured Items / Services */}
      {featuredItems.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {tenant.type === 'RESTAURANT' ? 'Featured Dishes' : 'Popular Services'}
                </h2>
                <p className="text-gray-500 mt-1">
                  {tenant.type === 'RESTAURANT'
                    ? "Chef's selection of our best dishes"
                    : 'Our most requested services'}
                </p>
              </div>
              <Link
                href={`/${params.tenant}/menu`}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm hidden sm:block"
              >
                View all →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredItems.map((item: any) => (
                <MenuCard key={item.id} item={item} currency={tenant.currency} />
              ))}
            </div>

            <div className="text-center mt-10 sm:hidden">
              <Link
                href={`/${params.tenant}/menu`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                View Full Menu
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Contact Info Preview */}
      {tenant.contactInfo && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  Find Us
                </h2>
                <div className="space-y-4">
                  {tenant.contactInfo.phone && (
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                        📞
                      </span>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <a
                          href={`tel:${tenant.contactInfo.phone}`}
                          className="text-gray-900 font-medium hover:text-blue-600"
                        >
                          {tenant.contactInfo.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {tenant.contactInfo.address && (
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                        📍
                      </span>
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="text-gray-900 font-medium">
                          {tenant.contactInfo.address}
                          {tenant.contactInfo.city && `, ${tenant.contactInfo.city}`}
                          {tenant.contactInfo.state && `, ${tenant.contactInfo.state}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {tenant.contactInfo.email && (
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                        ✉️
                      </span>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <a
                          href={`mailto:${tenant.contactInfo.email}`}
                          className="text-gray-900 font-medium hover:text-blue-600"
                        >
                          {tenant.contactInfo.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-8">
                  <Link
                    href={`/${params.tenant}/contact`}
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Get in Touch
                  </Link>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <QRCodeDisplay
                  url={publicUrl}
                  businessName={tenant.name}
                  size={200}
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
