import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

export async function generateMetadata({ params }: { params: { tenant: string } }): Promise<Metadata> {
  const tenant = await getTenant(params.tenant);
  if (!tenant) return { title: 'Contact' };
  const contact = tenant.contactInfo;
  const address = [contact?.address, contact?.city, contact?.country].filter(Boolean).join(', ');
  const description = address
    ? `Contact ${tenant.name}. Find us at ${address}.`
    : `Get in touch with ${tenant.name}. View our contact details and opening hours.`;
  return {
    title: 'Contact',
    description,
    openGraph: {
      title: `Contact | ${tenant.name}`,
      description,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary', title: `Contact | ${tenant.name}`, description },
  };
}

export default async function ContactPage({ params }: { params: { tenant: string } }) {
  const tenant = await getTenant(params.tenant);
  if (!tenant) notFound();

  // contactInfo is already included in the tenant response via findBySlug
  const contact = tenant.contactInfo ?? null;

  const openingHours = contact?.openingHours || {};
  const sortedDays = DAYS_ORDER.filter((day) => day in openingHours);
  const otherDays = Object.keys(openingHours).filter((day) => !DAYS_ORDER.includes(day));
  const allDays = [...sortedDays, ...otherDays];

  const fullAddress = [
    contact?.address,
    contact?.city,
    contact?.state,
    contact?.zipCode,
    contact?.country,
  ]
    .filter(Boolean)
    .join(', ');

  // Build a reliable map embed URL:
  // - Use mapUrl directly if it already contains "embed" (proper embed URL)
  // - Otherwise generate one from the address
  const mapEmbedUrl = contact?.mapUrl?.includes('embed')
    ? contact.mapUrl
    : fullAddress
    ? `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Contact Us</h1>
          <p className="text-gray-500 mt-2">We'd love to hear from you</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* Contact Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-5">
                {contact?.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      📞
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {contact.phone}
                      </p>
                    </div>
                  </a>
                )}

                {contact?.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      ✉️
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {contact.email}
                      </p>
                    </div>
                  </a>
                )}

                {fullAddress && (
                  <div className="flex items-start gap-4 p-4 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
                      📍
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Address</p>
                      <p className="font-semibold text-gray-900">{fullAddress}</p>
                      {contact?.mapUrl && (
                        <a
                          href={contact.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 inline-block"
                        >
                          Get Directions →
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {tenant.whatsappNumber && (
                  <a
                    href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I found ${tenant.name} on ServiSite.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                      💬
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">WhatsApp</p>
                      <p className="font-semibold text-green-700">Chat with us</p>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Opening Hours */}
            {allDays.length > 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Opening Hours</h2>
                <div className="space-y-3">
                  {allDays.map((day) => {
                    const hours = openingHours[day];
                    const isClosed = hours?.toLowerCase() === 'closed';
                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                      >
                        <span className="capitalize text-gray-700 font-medium">{day}</span>
                        <span
                          className={`text-sm font-medium ${
                            isClosed ? 'text-red-500' : 'text-green-600'
                          }`}
                        >
                          {hours || 'Hours not set'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Map embed or placeholder */}
          <div>
            {mapEmbedUrl ? (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 h-full min-h-[400px] flex flex-col">
                <iframe
                  src={mapEmbedUrl}
                  className="w-full flex-1 min-h-[400px]"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${tenant.name} location`}
                />
                {fullAddress && (
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate">{fullAddress}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-3 text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap flex-shrink-0"
                    >
                      Open in Maps →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <h3 className="text-lg font-semibold text-gray-700">Location Map</h3>
                <p className="text-gray-500 mt-2">
                  {fullAddress || 'Add your address in Settings → Contact'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
