import { notFound } from 'next/navigation';
import Link from 'next/link';
import HeroSection, { type HeroContent } from '../../components/tenant/HeroSection';
import { getPageTemplate, getBusinessPreset, resolveDesignTokens } from '../../config/page-templates';
import ScrollReveal from '../../components/ui/ScrollReveal';
import { generateTheme, getColorGroup } from '../../lib/theme';
import HomeSectionImage from '../../components/tenant/HomeSectionImage';

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
    const all = data.data || [];
    const popular = all.filter((i: any) => i.isPopular);
    // Use popular items if there are enough, otherwise fall back to all available
    return (popular.length >= 3 ? popular : all).slice(0, 9);
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

  // Resolve template — stored as pageTemplate in themeSettings
  const template = getPageTemplate(theme.pageTemplate);
  // Business preset: industry-appropriate colours, CTAs, terminology
  const preset = getBusinessPreset(tenant.type);
  // Colour priority: manual override → preset default → template default
  const primaryColor = theme.primaryColor || preset.primaryColor || template.primaryColor;
  const fontFamily = theme.fontFamily || template.fontFamily;
  const hangingHero = template.hangingHero ?? false;
  const designTokens = resolveDesignTokens(theme.pageTemplate, theme.designTokens);
  const glassEffect = designTokens.glassEffect;
  const cardRadius = designTokens.radius || '12px';

  const smartTheme = generateTheme(primaryColor);
  const colorGroup = getColorGroup(primaryColor);
  const showHomeBlocks = homeBlockEntries.length > 0;
  const socialLinks = theme.socialLinks as { instagram?: string; facebook?: string; tiktok?: string; twitter?: string; youtube?: string } | undefined;
// Google reviews take priority; fall back to manually added entries
  const reviewEntries = (googleReviews.length > 0 ? googleReviews : manualReviewEntries).slice(0, 4);
  const reviewsSource: 'google' | 'manual' = googleReviews.length > 0 ? 'google' : 'manual';
  const showReviewsSection = reviewEntries.length > 0 && theme.showReviews !== false;

  // Banner images: prefer themeSettings.bannerImages array, fall back to single banner field
  const bannerImages: string[] =
    Array.isArray(theme.bannerImages) && theme.bannerImages.length > 0
      ? theme.bannerImages
      : tenant.banner
      ? [tenant.banner]
      : [];

  const heroContent: HeroContent = theme.hero || {};

  return (
    <div className="bg-white">
      {/* Hero — tall wrapper for hanging templates */}
      <div className={hangingHero ? '[&>section]:min-h-[85vh]' : ''}>
        <HeroSection
          tenant={tenant}
          bannerImages={bannerImages}
          heroStyle={template.heroStyle}
          primaryColor={primaryColor}
          fontFamily={fontFamily}
          socialLinks={socialLinks}
          heroContent={heroContent}
        />
      </div>

      {/* Content — overlaps hero on hanging templates */}
      <div className={hangingHero ? 'relative z-10 -mt-16 rounded-t-[40px] overflow-hidden bg-white' : ''}>

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
        <section
          className="py-16"
          style={{
            background: glassEffect
              ? `linear-gradient(135deg, #0f0f0f 0%, ${primaryColor}33 50%, #0f0f0f 100%)`
              : template.showCategoryGrid ? '#0f0f0f' : '#ffffff',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="tenant-eyebrow mb-3" style={{ color: primaryColor }}>
                  {preset.featuredEyebrow}
                </p>
                <h2 className={`section-heading tenant-h2 text-3xl md:text-4xl leading-tight ${glassEffect || template.showCategoryGrid ? 'text-white' : 'text-gray-900'}`}>
                  {preset.featuredHeading}
                </h2>
              </div>
              <Link
                href={`/menu`}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                View full {preset.menuLabel.toLowerCase()} →
              </Link>
            </div>

            {/* 3×3 square tile grid */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {featuredItems.map((item: any, idx: number) => (
                <ScrollReveal key={item.id} delay={idx * 40}>
                <Link href={`/menu#item-${item.id}`}
                  className="item-card group relative bg-gray-100 block transition-shadow duration-300 overflow-hidden"
                  style={{ aspectRatio: '1/1', boxShadow: `0 4px 16px ${smartTheme.tileShadow}`, borderRadius: cardRadius }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl" style={{ backgroundColor: `${primaryColor}18` }}>🍽️</div>
                  )}
                  {/* Overlay — slides up on hover */}
                  <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)' }}>
                    <h3 className="text-white font-bold text-xs sm:text-sm leading-tight line-clamp-1">{item.name}</h3>
                    <p className="text-white/80 font-semibold text-xs mt-0.5">{formatPrice(item.price, tenant.currency || 'GBP')}</p>
                  </div>
                  {item.isPopular && (
                    <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-amber-400 text-amber-900 text-[9px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full">⭐</span>
                  )}
                </Link>
                </ScrollReveal>
              ))}
            </div>

            <div className="text-center mt-10 sm:hidden">
              <Link href={`/menu`}
                className="btn-primary inline-block font-bold px-8 py-3.5 shadow-lg transition-opacity"
                style={{ backgroundColor: primaryColor }}>
                View Full {preset.menuLabel}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Home Blocks — group-aware card layout */}
      {showHomeBlocks && (
        <div>
          {homeBlockEntries.map((entry: any, idx: number) => {
            const imagePos = entry.data?.imagePosition || (idx % 2 === 0 ? 'left' : 'right');
            const hasImage = !!entry.imageUrl;
            const gid = colorGroup.id;

            // ── Section background ──────────────────────────────────────────
            const sectionBg =
              gid === 'prestige'                   ? '#080808' :
              gid === 'modern' && idx % 2 === 0   ? '#1E293B' :
              gid === 'modern'                     ? '#F1F5F9' :
              gid === 'artisan'                    ? '#FAF7F2' :
              gid === 'botanical'                  ? '#EEF4EE' :
              idx % 2 === 0                        ? '#FAFAFA' : '#FFFFFF';

            // ── Dark card → use group's on-dark text colours inline ─────────
            const isDark = gid === 'prestige' || (gid === 'modern' && idx % 2 === 0);
            const headingColor = isDark ? colorGroup.headingOnDark : undefined;
            const bodyColor    = isDark ? colorGroup.bodyOnDark    : undefined;

            // ── Card style per group ────────────────────────────────────────
            // prestige  → Elegant Frame: thin gold border, dark interior
            // modern    → Zebra: no card wrapper, raw content with large gap
            // others    → Floating Canvas: white rounded card with soft shadow
            const useCard   = gid !== 'modern';
            const cardClass = gid === 'prestige'
              ? 'rounded-3xl overflow-hidden'
              : 'bg-white rounded-[40px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.06)]';
            const cardStyle: React.CSSProperties = gid === 'prestige'
              ? { border: '1px solid #D4AF37', backgroundColor: '#0f0f0f' }
              : {};

            // On dark cards the CSS !important rules in globals.css override inline styles,
            // so we must not apply the class-based colour helpers when we need dark-mode text.
            const headingClasses = isDark
              ? 'text-3xl leading-tight mb-4 font-bold'
              : 'section-heading tenant-h2 text-3xl leading-tight mb-4';
            const bodyClasses = isDark
              ? 'leading-relaxed whitespace-pre-line text-sm'
              : 'leading-relaxed whitespace-pre-line text-sm text-gray-600';
            const defaultBodyColor = isDark ? (bodyColor ?? '#E5E7EB') : undefined;
            const defaultHeadingColor = isDark ? (headingColor ?? '#FFFFFF') : undefined;

            const hasDescription = !!entry.data?.description?.trim();
            const hasTitle = !!entry.title?.trim();
            const hasText = hasTitle || !!entry.data?.subtitle || hasDescription;
            // Float side layout only useful when there is body description text to flow beside.
            // Image-only or title-only → centre layout.
            const effectivePos = hasImage && !hasDescription ? 'center' : imagePos;

            const imgBg = isDark ? 'transparent' : '#f8f8f8';

            const inner = hasImage && effectivePos === 'center' ? (
              // ── Centre layout: image on top, text centred below ─────────────
              <ScrollReveal delay={0}>
                {hasText ? (
                  // With text: fixed height container, image contained
                  <HomeSectionImage
                    src={entry.imageUrl}
                    alt={entry.title || ''}
                    className="w-full h-full object-contain"
                    wrapperClassName="relative overflow-hidden w-full"
                    wrapperStyle={{ maxHeight: 420, height: '56vw', backgroundColor: imgBg }}
                  />
                ) : (
                  // Image only: natural dimensions, no gaps
                  <HomeSectionImage
                    natural
                    src={entry.imageUrl}
                    alt={entry.title || ''}
                    className="w-full h-auto block rounded-2xl"
                  />
                )}
                {hasText && (
                  <div className={`text-center ${useCard ? 'py-10 px-8 lg:px-20' : 'py-8'}`}>
                    {entry.data?.subtitle && (
                      <p className="tenant-eyebrow mb-3 justify-center" style={{ color: primaryColor }}>{entry.data.subtitle}</p>
                    )}
                    {hasTitle && (
                      <h2
                        className={headingClasses.replace('mb-4', 'mb-5') + ' md:text-4xl'}
                        style={defaultHeadingColor ? { color: defaultHeadingColor } : {}}
                      >
                        {entry.title}
                      </h2>
                    )}
                    {hasDescription && (
                      <>
                        <div className="w-10 h-px mb-5 mx-auto" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                        <p
                          className={`${bodyClasses.replace('text-sm', 'text-base')} max-w-2xl mx-auto`}
                          style={defaultBodyColor ? { color: defaultBodyColor } : {}}
                        >
                          {entry.data.description}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </ScrollReveal>
            ) : hasImage ? (
              // ── Left / Right layout ─────────────────────────────────────────
              // Heading centred full-width at top.
              // Image floats to selected side; description starts at same top
              // edge and naturally wraps to full-width below the image.
              <ScrollReveal delay={0}>
                <div className={useCard ? 'px-6 sm:px-10 lg:px-14 py-10 lg:py-14' : 'py-8 px-4'}>

                  {/* Centred eyebrow + heading */}
                  {(entry.data?.subtitle || hasTitle) && (
                    <div className="text-center mb-6 lg:mb-8">
                      {entry.data?.subtitle && (
                        <p className="tenant-eyebrow mb-3 justify-center" style={{ color: primaryColor }}>
                          {entry.data.subtitle}
                        </p>
                      )}
                      {hasTitle && (
                        <h2
                          className={headingClasses.replace('mb-4', 'mb-0') + ' md:text-4xl'}
                          style={defaultHeadingColor ? { color: defaultHeadingColor } : {}}
                        >
                          {entry.title}
                        </h2>
                      )}
                    </div>
                  )}

                  {/* Float zone — image floats beside description;
                      overflow text wraps to full width below image */}
                  <div className="overflow-hidden">
                    <HomeSectionImage
                      src={entry.imageUrl}
                      alt={entry.title || ''}
                      className="w-full h-full object-contain"
                      wrapperClassName={`relative rounded-2xl overflow-hidden mb-4 w-full ${
                        effectivePos === 'right'
                          ? 'sm:float-right sm:ml-8 sm:mb-3'
                          : 'sm:float-left sm:mr-8 sm:mb-3'
                      } sm:w-[46%]`}
                      wrapperStyle={{ aspectRatio: '4 / 3', backgroundColor: imgBg }}
                    />
                    {hasDescription && (
                      <>
                        <div className="w-10 h-px mb-4" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                        <p
                          className={`${bodyClasses} leading-relaxed`}
                          style={defaultBodyColor ? { color: defaultBodyColor } : {}}
                        >
                          {entry.data.description}
                        </p>
                      </>
                    )}
                    <div className="clear-both" />
                  </div>

                </div>
              </ScrollReveal>
            ) : (
              // ── Text Only — centered, editorial quote feel ──────────────────
              <ScrollReveal delay={0}>
                <div className={`text-center ${useCard ? 'py-14 px-8 lg:px-20' : 'py-8'}`}>
                  {entry.data?.subtitle && (
                    <p className="tenant-eyebrow mb-4 justify-center" style={{ color: primaryColor }}>{entry.data.subtitle}</p>
                  )}
                  {hasTitle && (
                    <h2
                      className={headingClasses.replace('mb-4', 'mb-5') + ' md:text-4xl'}
                      style={defaultHeadingColor ? { color: defaultHeadingColor } : {}}
                    >
                      {entry.title}
                    </h2>
                  )}
                  {hasDescription && (
                    <>
                      <div className="w-10 h-px mb-6 mx-auto" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                      <p
                        className={`${bodyClasses.replace('text-sm', 'text-base')} max-w-2xl mx-auto ${gid === 'prestige' || gid === 'artisan' ? 'italic' : ''}`}
                        style={defaultBodyColor ? { color: defaultBodyColor } : {}}
                      >
                        &ldquo;{entry.data.description}&rdquo;
                      </p>
                    </>
                  )}
                </div>
              </ScrollReveal>
            );

            return (
              <section key={entry.id} className="py-8" style={{ backgroundColor: sectionBg }}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  {useCard ? (
                    <div className={cardClass} style={cardStyle}>{inner}</div>
                  ) : inner}
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
              <p className="tenant-eyebrow mb-3 justify-center" style={{ color: primaryColor }}>Reviews</p>
              <h2 className="section-heading tenant-h2 text-3xl md:text-4xl text-gray-900">What Our Customers Say</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      </div> {/* end hanging content wrapper */}
    </div>
  );
}
