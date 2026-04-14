import { notFound } from 'next/navigation';
import Link from 'next/link';
import HeroSection from '../../components/tenant/HeroSection';
import QRCodeDisplay from '../../components/tenant/QRCodeDisplay';
import { getPageTemplate } from '../../config/page-templates';
import ScrollReveal from '../../components/ui/ScrollReveal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      next: { tags: [`tenant:${slug}`], revalidate: 10 },
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
      next: { tags: [`tenant:${slug}:entries`], revalidate: 30 },
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
  const [tenant, featuredItems, menuGroups, googleReviews, manualReviewEntries, homeBlockEntries] = await Promise.all([
    getTenant(params.tenant),
    getFeaturedItems(params.tenant),
    getMenuGroups(params.tenant),
    getGoogleReviews(params.tenant),
    getPageEntries(params.tenant, 'reviews'),
    getPageEntries(params.tenant, 'home-blocks'),
  ]);

  if (!tenant) notFound();

  const publicUrl = `https://${tenant.slug}.${APP_DOMAIN}`;
  const theme = tenant.themeSettings as any || {};
  const isRestaurant = tenant.type === 'RESTAURANT' || tenant.type === 'CAFE';

  // Resolve template — stored as pageTemplate in themeSettings
  const template = getPageTemplate(theme.pageTemplate);
  // Allow manual colour overrides to coexist with template defaults
  const primaryColor = theme.primaryColor || template.primaryColor;
  const fontFamily = theme.fontFamily || template.fontFamily;

  const showHomeBlocks = homeBlockEntries.length > 0;
  const socialLinks = theme.socialLinks as { instagram?: string; facebook?: string; tiktok?: string; twitter?: string; youtube?: string } | undefined;
  // Google reviews take priority; fall back to manually added entries
  const reviewEntries = googleReviews.length > 0 ? googleReviews : manualReviewEntries;
  const reviewsSource: 'google' | 'manual' = googleReviews.length > 0 ? 'google' : 'manual';
  const showReviewsSection = reviewEntries.length > 0 && theme.showReviews !== false;

  // Banner images: prefer themeSettings.bannerImages array, fall back to single banner field
  const bannerImages: string[] =
    Array.isArray(theme.bannerImages) && theme.bannerImages.length > 0
      ? theme.bannerImages
      : tenant.banner
      ? [tenant.banner]
      : [];

  return (
    <div className="bg-white">
      {/* Hero */}
      <HeroSection
        tenant={tenant}
        bannerImages={bannerImages}
        heroStyle={template.heroStyle}
        primaryColor={primaryColor}
        fontFamily={fontFamily}
        socialLinks={socialLinks}
      />

      {/* Menu Groups — category showcase grid (Grand template) or pill nav */}
      {menuGroups.length > 0 && (
        template.showCategoryGrid ? (
          <section className="grid grid-cols-2 lg:grid-cols-4" style={{ backgroundColor: '#0a0a0a' }}>
            {menuGroups.slice(0, 4).map((group: any, idx: number) => {
              const darkBgs = [
                'linear-gradient(135deg, #1a1209 0%, #2d1f08 100%)',
                'linear-gradient(135deg, #0a0f1a 0%, #131f35 100%)',
                'linear-gradient(135deg, #0f0a14 0%, #1e1028 100%)',
                'linear-gradient(135deg, #0a1208 0%, #142010 100%)',
              ];
              return (
                <Link
                  key={group.id}
                  href={`/menu?group=${group.id}`}
                  className="relative flex items-end overflow-hidden group"
                  style={{ minHeight: 280 }}
                >
                  {group.imageUrl ? (
                    <img
                      src={group.imageUrl}
                      alt={group.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ background: darkBgs[idx % darkBgs.length] }} />
                  )}
                  {/* Gold border accent top */}
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: primaryColor, opacity: 0.6 }} />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-all duration-300" />
                  <div className="relative z-10 p-6 w-full">
                    {group.icon && (
                      <span className="text-3xl mb-2 block">{group.icon}</span>
                    )}
                    <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: primaryColor }}>
                      Explore
                    </p>
                    <h3
                      className="text-xl font-black text-white leading-tight group-hover:text-amber-100 transition-colors"
                      style={{ fontFamily: `'Playfair Display', Georgia, serif` }}
                    >
                      {group.name}
                    </h3>
                    <div className="w-8 h-px mt-3 group-hover:w-16 transition-all duration-300" style={{ backgroundColor: primaryColor }} />
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
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
        )
      )}

      {/* Featured Items */}
      {featuredItems.length > 0 && (
        <section className={`py-16 ${template.showCategoryGrid ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>
                  {isRestaurant ? 'From the Kitchen' : 'Top Picks'}
                </p>
                <h2 className={`text-3xl md:text-4xl font-black leading-tight ${template.showCategoryGrid ? 'text-white' : 'text-gray-900'}`}
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
              /* Elegant: horizontal scroll on mobile, 2-col grid on sm+ */
              <>
                <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-none sm:hidden">
                  {featuredItems.slice(0, 4).map((item: any) => (
                    <Link key={item.id} href={`/menu#item-${item.id}`}
                      className="group relative overflow-hidden rounded-2xl bg-gray-100 flex-shrink-0 hover:shadow-2xl transition-all duration-300 block"
                      style={{ minHeight: '260px', width: '72vw', maxWidth: '280px' }}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gray-100">🍽️</div>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 60%)' }} />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        {item.isPopular && (
                          <span className="inline-block bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full mb-2">⭐ Popular</span>
                        )}
                        <h3 className="text-white font-bold text-lg leading-snug"
                          style={{ fontFamily: `'${fontFamily}', Georgia, serif` }}>{item.name}</h3>
                        <p className="text-white font-bold mt-1.5" style={{ color: `${primaryColor}` }}>
                          {formatPrice(item.price, tenant.currency || 'GBP')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="hidden sm:grid sm:grid-cols-2 gap-8">
                  {featuredItems.slice(0, 4).map((item: any, idx: number) => (
                    <ScrollReveal key={item.id} delay={idx * 80}>
                    <Link href={`/menu#item-${item.id}`}
                      className="group relative overflow-hidden rounded-2xl bg-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 block"
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
                    </ScrollReveal>
                  ))}
                </div>
              </>
            ) : (
              /* Classic / Modern / Fresh: horizontal scroll on mobile, 3-col grid on sm+ */
              <>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none sm:hidden">
                  {featuredItems.map((item: any) => (
                    <Link key={item.id} href={`/menu#item-${item.id}`}
                      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex-shrink-0 hover:shadow-xl transition-all duration-300 block"
                      style={{ width: '65vw', maxWidth: '260px' }}
                    >
                      <div className="relative bg-gray-100 overflow-hidden" style={{ height: 180 }}>
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
                      <div className="p-3">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{item.name}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredItems.map((item: any, idx: number) => (
                    <ScrollReveal key={item.id} delay={idx * 70}>
                    <Link href={`/menu#item-${item.id}`}
                      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block"
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
                    </ScrollReveal>
                  ))}
                </div>
              </>
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

      {/* Home Blocks — custom content sections */}
      {showHomeBlocks && (
        <div>
          {homeBlockEntries.map((entry: any, idx: number) => {
            const imagePos = entry.data?.imagePosition || (idx % 2 === 0 ? 'left' : 'right');
            const hasImage = !!entry.imageUrl;
            return (
              <section key={entry.id} className={`py-16 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  {hasImage ? (
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                      <ScrollReveal delay={0} className={imagePos === 'left' ? 'lg:order-2' : 'lg:order-1'}>
                        <div>
                          {entry.data?.subtitle && (
                            <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>{entry.data.subtitle}</p>
                          )}
                          <h2 className="text-3xl font-black text-gray-900 mb-4 leading-tight"
                            style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                            {entry.title}
                          </h2>
                          <div className="w-12 h-1 rounded-full mb-5" style={{ backgroundColor: primaryColor }} />
                          <p className="text-gray-600 leading-relaxed whitespace-pre-line">{entry.data?.description}</p>
                        </div>
                      </ScrollReveal>
                      <ScrollReveal delay={80} className={imagePos === 'left' ? 'lg:order-1' : 'lg:order-2'}>
                        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                          <img src={entry.imageUrl} alt={entry.title || ''} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      </ScrollReveal>
                    </div>
                  ) : (
                    <ScrollReveal delay={0}>
                      <div className="max-w-3xl mx-auto text-center">
                        {entry.data?.subtitle && (
                          <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: primaryColor }}>{entry.data.subtitle}</p>
                        )}
                        <h2 className="text-3xl font-black text-gray-900 mb-4"
                          style={{ fontFamily: fontFamily === 'Playfair Display' ? `'Playfair Display', Georgia, serif` : undefined }}>
                          {entry.title}
                        </h2>
                        <div className="w-12 h-1 rounded-full mb-6 mx-auto" style={{ backgroundColor: primaryColor }} />
                        <p className="text-gray-600 leading-relaxed whitespace-pre-line">{entry.data?.description}</p>
                      </div>
                    </ScrollReveal>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

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
                const mapsUrl: string | null = isGoogle ? entry.googleMapsUri : null;
                const Wrapper = mapsUrl ? 'a' : 'div';
                const wrapperProps = mapsUrl ? { href: mapsUrl, target: '_blank', rel: 'noopener noreferrer' } : {};
                return (
                  <Wrapper key={isGoogle ? idx : entry.id} {...wrapperProps} className="bg-white rounded-2xl p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-lg ${i < rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4">"{comment}"</p>
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
                  </Wrapper>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact & QR */}
      {tenant.contactInfo && (tenant.whatsappNumber || tenant.contactInfo.phone || tenant.contactInfo.address || tenant.contactInfo.email) && (
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
                  {(tenant.whatsappNumber || tenant.contactInfo.phone) && (
                    <a href={`tel:${tenant.whatsappNumber || tenant.contactInfo.phone}`} className="flex items-center gap-4 group">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${primaryColor}33` }}>📞</span>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Phone</p>
                        <p className="text-white font-semibold group-hover:underline">{tenant.whatsappNumber || tenant.contactInfo.phone}</p>
                      </div>
                    </a>
                  )}
                  {tenant.contactInfo.address && (
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: `${primaryColor}33` }}>📍</span>
                      <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Address</p>
                        <p className="text-white font-semibold">
                          {[tenant.contactInfo.address, tenant.contactInfo.city, tenant.contactInfo.zipCode, tenant.contactInfo.country].filter(Boolean).join(', ')}
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
                {/* Social links in footer/contact */}
                {socialLinks && Object.values(socialLinks).some(Boolean) && (
                  <div className="flex items-center gap-3 mt-6">
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        style={{ backgroundColor: `${primaryColor}33` }}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </a>
                    )}
                    {socialLinks.facebook && (
                      <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        style={{ backgroundColor: `${primaryColor}33` }}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </a>
                    )}
                    {socialLinks.tiktok && (
                      <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        style={{ backgroundColor: `${primaryColor}33` }}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        style={{ backgroundColor: `${primaryColor}33` }}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    )}
                    {socialLinks.youtube && (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        style={{ backgroundColor: `${primaryColor}33` }}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                  </div>
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
