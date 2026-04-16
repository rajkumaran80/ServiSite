import { notFound } from 'next/navigation';
import Link from 'next/link';
import HeroSection from '../../components/tenant/HeroSection';
import { getPageTemplate } from '../../config/page-templates';
import ScrollReveal from '../../components/ui/ScrollReveal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

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
      headers: { 'X-Tenant-ID': slug, ...(INTERNAL_SECRET && { 'X-Internal-Secret': INTERNAL_SECRET }) },
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

    </div>
  );
}
