import { notFound } from 'next/navigation';
import Link from 'next/link';
import HeroSection from '../../components/tenant/HeroSection';
import QRCodeDisplay from '../../components/tenant/QRCodeDisplay';
import { getPageTemplate } from '../../config/page-templates';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';

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

async function getFeaturedItems(slug: string) {
  try {
    const res = await fetch(`${API_URL}/menu/items?available=true`, {
      next: { tags: [`tenant:${slug}:menu`], revalidate: 300 },
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).slice(0, 6);
  } catch { return []; }
}

async function getMenuGroups(slug: string) {
  try {
    const res = await fetch(`${API_URL}/menu/groups`, {
      next: { tags: [`tenant:${slug}:menu`], revalidate: 1800 },
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).filter((g: any) => g.isActive);
  } catch { return []; }
}

async function getPageEntries(slug: string, pageKey: string) {
  try {
    const res = await fetch(`${API_URL}/page-entries?pageKey=${pageKey}`, {
      next: { tags: [`tenant:${slug}:${pageKey}`], revalidate: 300 },
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

async function getGoogleReviews(slug: string) {
  try {
    const res = await fetch(`${API_URL}/google-reviews`, {
      next: { tags: [`tenant:${slug}:google-reviews`], revalidate: 86400 }, // 24h
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

function formatPrice(price: number | string, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(typeof price === 'string' ? parseFloat(price) : price);
}

export default async function TenantHomePage({ params }: { params: { tenant: string } }) {
  const [tenant, featuredItems, menuGroups, aboutEntries, googleReviews, manualReviewEntries] = await Promise.all([
    getTenant(params.tenant),
    getFeaturedItems(params.tenant),
    getMenuGroups(params.tenant),
    getPageEntries(params.tenant, 'about'),
    getGoogleReviews(params.tenant),
    getPageEntries(params.tenant, 'reviews'),
  ]);

  if (!tenant) notFound();

  const publicUrl = `https://${tenant.slug}.${APP_DOMAIN}`;
  const theme = tenant.themeSettings as any || {};
  const promoImageUrl = theme.promoImageUrl || null;
  const isRestaurant = tenant.type === 'RESTAURANT' || tenant.type === 'CAFE';

  // Resolve template — stored as pageTemplate in themeSettings
  const template = getPageTemplate(theme.pageTemplate);
  // Allow manual colour overrides to coexist with template defaults
  const primaryColor = theme.primaryColor || template.primaryColor;
  const fontFamily = theme.fontFamily || template.fontFamily;

  const showAboutSection = theme.showAboutOnHome !== false && aboutEntries.length > 0;
  // Google reviews take priority; fall back to manually added entries
  const reviewEntries = googleReviews.length > 0 ? googleReviews : manualReviewEntries;
  const reviewsSource: 'google' | 'manual' = googleReviews.length > 0 ? 'google' : 'manual';
  const showReviewsSection = theme.showReviewsOnHome !== false && reviewEntries.length > 0;

  // Banner images: prefer themeSettings.bannerImages array, fall back to single banner field
  const bannerImages: string[] =
    Array.isArray(theme.bannerImages) && theme.bannerImages.length > 0
      ? theme.bannerImages
      : tenant.banner
      ? [tenant.banner]
      : [];

  const featurePoints = isRestaurant
    ? [
        { icon: '🌿', title: 'Fresh Ingredients', desc: 'Locally sourced, quality produce every day' },
        { icon: '👨‍🍳', title: 'Expert Chefs', desc: 'Passionate cooks with years of experience' },
        { icon: '⚡', title: 'Quick Service', desc: 'Fast, attentive service without compromise' },
      ]
    : [
        { icon: '✅', title: 'Quality Work', desc: 'Professional results every time' },
        { icon: '🕐', title: 'On Time', desc: 'We respect your schedule' },
        { icon: '💬', title: 'Great Support', desc: 'Always here to help you' },
      ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <HeroSection
        tenant={tenant}
        bannerImages={bannerImages}
        heroStyle={template.heroStyle}
        primaryColor={primaryColor}
        fontFamily={fontFamily}
      />

      {/* Menu Groups quick nav */}
      {menuGroups.length > 0 && (
        <section className="py-10 bg-gray-50 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-3">
              {menuGroups.map((group: any) => (
                <Link
                  key={group.id}
                  href={`/menu?group=${group.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-semibold text-gray-700"
                >
                  {group.icon && <span className="text-lg">{group.icon}</span>}
                  <span>{group.name}</span>
                </Link>
              ))}
              <Link
                href={`/menu`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white shadow hover:shadow-lg hover:-translate-y-0.5 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                View All →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Items */}
      {featuredItems.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>
                  {isRestaurant ? 'From the Kitchen' : 'Top Picks'}
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight"
                  style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                  {isRestaurant ? 'Featured Dishes' : 'Popular Services'}
                </h2>
              </div>
              <Link
                href={`/menu`}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                View full {isRestaurant ? 'menu' : 'list'} →
              </Link>
            </div>

            {/* Grid or Large card layout */}
            {template.cardStyle === 'large' ? (
              /* Elegant: 2-col large cards */
              <div className="grid sm:grid-cols-2 gap-8">
                {featuredItems.slice(0, 4).map((item: any) => (
                  <Link key={item.id} href={`/menu`}
                    className="group relative overflow-hidden rounded-2xl bg-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                    style={{ minHeight: '320px' }}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gray-100">🍽️</div>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      {item.isPopular && (
                        <span className="inline-block bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full mb-2">⭐ Popular</span>
                      )}
                      <h3 className="text-white font-bold text-xl leading-snug"
                        style={{ fontFamily: `'${fontFamily}', Georgia, serif` }}>{item.name}</h3>
                      {item.description && <p className="text-white/70 text-sm mt-1 line-clamp-1">{item.description}</p>}
                      <p className="text-white font-bold mt-2" style={{ color: `${primaryColor}` }}>
                        {formatPrice(item.price, tenant.currency || 'GBP')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* Classic / Modern / Fresh: 3-col card grid */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredItems.map((item: any) => (
                  <Link key={item.id} href={`/menu`}
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative h-52 bg-gray-100 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
                      )}
                      {item.isPopular && (
                        <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">⭐ Popular</span>
                      )}
                      <div className="absolute bottom-3 right-3 text-white text-sm font-bold px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-sm"
                        style={{ backgroundColor: `${primaryColor}e6` }}>
                        {formatPrice(item.price, tenant.currency || 'GBP')}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-base leading-snug">{item.name}</h3>
                      {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="text-center mt-10 sm:hidden">
              <Link href={`/menu`}
                className="inline-block text-white font-bold px-8 py-3.5 rounded-xl shadow-lg"
                style={{ backgroundColor: primaryColor }}>
                View Full {isRestaurant ? 'Menu' : 'Services'}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About Us section */}
      {showAboutSection && (() => {
        const entry = aboutEntries[0];
        const description: string = entry.data?.description || '';
        const snippet = description.length > 300 ? description.slice(0, 300).trimEnd() + '…' : description;
        return (
          <section className="py-16 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>About Us</p>
                <h2 className="text-3xl font-black text-gray-900"
                  style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                  {entry.title || tenant.name}
                </h2>
              </div>
              {entry.imageUrl ? (
                <div className="grid lg:grid-cols-2 gap-10 items-center">
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                    <img src={entry.imageUrl} alt={entry.title || 'About us'} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-600 leading-relaxed text-base">{snippet}</p>
                    <Link href="/about" className="inline-flex items-center gap-1.5 mt-6 text-sm font-bold" style={{ color: primaryColor }}>
                      Read our full story →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto text-center">
                  <p className="text-gray-600 leading-relaxed text-base">{snippet}</p>
                  <Link href="/about" className="inline-flex items-center gap-1.5 mt-6 text-sm font-bold" style={{ color: primaryColor }}>
                    Read our full story →
                  </Link>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* Customer Reviews section */}
      {showReviewsSection && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>Reviews</p>
              <h2 className="text-3xl font-black text-gray-900"
                style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                What Our Customers Say
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviewEntries.map((entry: any, idx: number) => {
                const isGoogle = reviewsSource === 'google';
                const authorName: string = isGoogle ? entry.authorName : entry.title;
                const photoUrl: string | null = isGoogle ? entry.authorPhotoUrl : entry.imageUrl;
                const rating: number = Math.min(5, Math.max(1, Number(isGoogle ? entry.rating : entry.data?.rating) || 5));
                const comment: string = isGoogle ? entry.text : (entry.data?.comment || '');
                const relativeTime: string | null = isGoogle ? entry.relativeTime : null;
                return (
                  <div key={isGoogle ? idx : entry.id} className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-lg ${i < rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    {/* Comment */}
                    <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4">"{comment}"</p>
                    {/* Author */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                      {photoUrl ? (
                        <img src={photoUrl} alt={authorName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: primaryColor }}>
                          {(authorName || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{authorName}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {isGoogle ? (
                            <>
                              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21.35 11.1h-9.18v2.93h5.34c-.23 1.24-.95 2.29-2.03 3l3.28 2.54c1.91-1.76 3.01-4.35 3.01-7.47 0-.58-.05-1.14-.14-1.7z" fill="#4285F4"/>
                                <path d="M11.17 22c2.7 0 4.96-.9 6.62-2.43l-3.28-2.54c-.9.6-2.04.96-3.34.96-2.57 0-4.74-1.74-5.52-4.07H2.3v2.63A9.99 9.99 0 0011.17 22z" fill="#34A853"/>
                                <path d="M5.65 13.92A5.97 5.97 0 015.35 12c0-.67.12-1.32.3-1.93V7.44H2.3A9.99 9.99 0 001.17 12c0 1.62.39 3.14 1.13 4.56l3.35-2.64z" fill="#FBBC05"/>
                                <path d="M11.17 5.97c1.45 0 2.75.5 3.77 1.48l2.83-2.83C16.13 2.99 13.87 2 11.17 2A9.99 9.99 0 002.3 7.44l3.35 2.63c.78-2.33 2.95-4.1 5.52-4.1z" fill="#EA4335"/>
                              </svg>
                              Google · {relativeTime}
                            </>
                          ) : (
                            <span>Verified customer</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* About / Promo section */}
      {promoImageUrl ? (
        <section className="overflow-hidden">
          <div className="grid lg:grid-cols-2 min-h-[440px]">
            <div className="relative order-2 lg:order-1 min-h-[300px]">
              <img src={promoImageUrl} alt={`${tenant.name}`} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="order-1 lg:order-2 flex flex-col justify-center px-8 py-14 lg:px-14"
              style={{ backgroundColor: `${primaryColor}0d` }}>
              <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Why Choose Us</p>
              <h2 className="text-3xl lg:text-4xl font-black text-gray-900 mb-8 leading-tight"
                style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                {isRestaurant ? 'Food Made with Passion' : 'Service You Can Trust'}
              </h2>
              <div className="space-y-5">
                {featurePoints.map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor}20` }}>{icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{title}</p>
                      <p className="text-gray-500 text-sm">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-14" style={{ backgroundColor: `${primaryColor}0d` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>Why Choose Us</p>
              <h2 className="text-2xl font-black text-gray-900"
                style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                {isRestaurant ? 'Food Made with Passion' : 'Service You Can Trust'}
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              {featurePoints.map(({ icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-7 shadow-sm text-center">
                  <div className="text-4xl mb-3">{icon}</div>
                  <h3 className="font-bold text-gray-900 text-base mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact & QR */}
      {tenant.contactInfo && (tenant.contactInfo.phone || tenant.contactInfo.address || tenant.contactInfo.email) && (
        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: primaryColor }}>Get In Touch</p>
                <h2 className="text-3xl md:text-4xl font-black mb-8 leading-tight"
                  style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                  We'd Love<br />to Hear From You
                </h2>
                <div className="space-y-5">
                  {tenant.contactInfo.phone && (
                    <a href={`tel:${tenant.contactInfo.phone}`} className="flex items-center gap-4 group">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${primaryColor}33` }}>📞</span>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Phone</p>
                        <p className="text-white font-semibold group-hover:underline">{tenant.contactInfo.phone}</p>
                      </div>
                    </a>
                  )}
                  {tenant.contactInfo.address && (
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${primaryColor}33` }}>📍</span>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Address</p>
                        <p className="text-white font-semibold">
                          {tenant.contactInfo.address}{tenant.contactInfo.city && `, ${tenant.contactInfo.city}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {tenant.contactInfo.email && (
                    <a href={`mailto:${tenant.contactInfo.email}`} className="flex items-center gap-4 group">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${primaryColor}33` }}>✉️</span>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Email</p>
                        <p className="text-white font-semibold group-hover:underline">{tenant.contactInfo.email}</p>
                      </div>
                    </a>
                  )}
                </div>
                {tenant.whatsappNumber && (
                  <a href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I'm interested in ${tenant.name}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 mt-8 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold px-6 py-3.5 rounded-xl transition-all hover:scale-[1.03] shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Chat on WhatsApp
                  </a>
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="bg-white rounded-3xl p-6 shadow-2xl inline-block">
                  <QRCodeDisplay url={publicUrl} businessName={tenant.name} size={180} />
                </div>
                <p className="text-white/60 text-sm mt-4">Scan to share this page</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
