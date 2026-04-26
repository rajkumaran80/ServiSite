import { notFound } from 'next/navigation';
import Link from 'next/link';
import HeroSection, { type HeroContent } from '../../components/tenant/HeroSection';
import { SectionRenderer } from '../../components/tenant/SectionRenderer';
import { getPageTemplate, getBusinessPreset, resolveDesignTokens } from '../../config/page-templates';
import ScrollReveal from '../../components/ui/ScrollReveal';
import { generateTheme, getColorGroup, getBrightness, SECTION_BG_PALETTES, type SectionBgEntry } from '../../lib/theme';
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

async function getNavItems(slug: string) {
  try {
    const res = await fetch(`${API_URL}/navigation`, {
      next: { tags: [`tenant:${slug}:nav`], revalidate: 60 },
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

function isMenuEnabled(navItems: any[]): boolean {
  // Check if there's an active navigation item with featureKey 'food_menu'
  return navItems.some(item => 
    item.featureKey === 'food_menu' && 
    item.isActive && 
    item.linkType === 'INTERNAL_FEATURE'
  );
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

async function getHomeSections(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}/home-sections`, {
      next: { tags: [`tenant:${slug}:home-sections`], revalidate: 60 },
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

export default async function TenantHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const [tenant, featuredItems, menuGroups, googleReviews, manualReviewEntries, homeBlockEntries, homeSections, navItems] = await Promise.all([
    getTenant(tenantSlug),
    getFeaturedItems(tenantSlug),
    getMenuGroups(tenantSlug),
    getGoogleReviews(tenantSlug),
    getPageEntries(tenantSlug, 'reviews'),
    getPageEntries(tenantSlug, 'home'),
    getHomeSections(tenantSlug),
    getNavItems(tenantSlug),
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
  // Hide legacy auto-reviews when custom homeSections are set — user controls the page layout via CMS
  const showReviewsSection = reviewEntries.length > 0 && theme.showReviews !== false && homeSections.length === 0;

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
          showMenu={tenant.serviceProfile === 'FOOD_SERVICE' && isMenuEnabled(navItems)}
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

      {/* Home Blocks — new CMS sections take priority over legacy page-entries */}
      {homeSections.length > 0 ? (
        homeSections.map((section: any) => (
          <SectionRenderer key={section.id} section={section} primaryColor={primaryColor} themeSettings={theme} tenantSlug={tenantSlug} />
        ))
      ) : showHomeBlocks && (
        <div>
          {homeBlockEntries.map((entry: any, idx: number) => {
            const sectionType: 'content' | 'awards' | 'social-proof' = entry.data?.sectionType || 'content';
            const gid = colorGroup.id;

            // Background from global sectionBgMode - cycles by index
            const rawBgMode: string = (theme as any).sectionBgMode || 'soft';
            const bgMode = (['dark', 'soft', 'contrast'] as const).includes(rawBgMode as any)
              ? (rawBgMode as 'dark' | 'soft' | 'contrast')
              : 'soft';

            const groupPalette = SECTION_BG_PALETTES[gid as keyof typeof SECTION_BG_PALETTES]
              ?? SECTION_BG_PALETTES.modern;
            const seq: SectionBgEntry[] = groupPalette[bgMode];

            // Awards/social-proof use the darkest slot only when the palette has dark entries.
            // In soft mode (all light) they cycle normally so consecutive sections don't share a bg.
            const hasDarkSlot = seq.some((e) => e.dark);
            const forceDark = sectionType !== 'content' && hasDarkSlot;
            let bgEntry: SectionBgEntry;
            if (forceDark) {
              bgEntry = seq.find((e) => e.dark) ?? seq[seq.length - 1];
            } else {
              bgEntry = seq[idx % seq.length];
            }

            const bgBase = bgEntry.bg;
            const isDark = bgEntry.dark;

            // Pattern overlay
            const pattern: string = entry.data?.pattern || 'none';
            const pc = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.045)';
            const patternStyle: React.CSSProperties = (() => {
              switch (pattern) {
                case 'dots':
                  return { backgroundImage: `radial-gradient(circle, ${pc} 1px, transparent 1px)`, backgroundSize: '22px 22px' };
                case 'grid':
                  return { backgroundImage: `linear-gradient(${pc} 1px, transparent 1px), linear-gradient(to right, ${pc} 1px, transparent 1px)`, backgroundSize: '30px 30px' };
                case 'diagonal':
                  return { backgroundImage: `repeating-linear-gradient(45deg, ${pc} 0, ${pc} 1px, transparent 0, transparent 50%)`, backgroundSize: '14px 14px' };
                default: return {};
              }
            })();

            const sectionStyle: React.CSSProperties = { backgroundColor: bgBase, ...patternStyle };

            // Text colours - always resolved for both dark and light slots
            // Light sections: always use near-black for headings for maximum readability
            // (tinted headingOnWhite colors like dark-green or gold can still look washed
            // out on same-hue light backgrounds). headingOnWhite used only for accents.
            const headingColor = isDark
              ? (colorGroup.headingOnDark ?? '#FFFFFF')
              : '#0f0f0f';
            const bodyColor = isDark
              ? (colorGroup.bodyOnDark ?? '#D1D5DB')
              : (colorGroup.bodyOnWhite ?? '#374151');
            // Accent color for eyebrows/labels on light sections
            const accentOnLight = colorGroup.headingOnWhite === 'var(--primary-hex)'
              ? primaryColor
              : colorGroup.headingOnWhite;

            // AWARDS STRIP
            if (sectionType === 'awards') {
              const awards: { name: string; subtitle: string }[] = (entry.data?.awards || []).filter((a: any) => a.name?.trim());
              if (!awards.length) return null;
              const cols = Math.min(awards.length, 6);
              return (
                <section key={entry.id} style={sectionStyle}>
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {entry.title?.trim() && (
                      <p className="text-center text-xs font-bold tracking-[0.2em] uppercase mb-6" style={{ color: headingColor || primaryColor }}>
                        {entry.title}
                      </p>
                    )}
                    <div
                      className="grid gap-6"
                      style={{ gridTemplateColumns: `repeat(${Math.min(cols, 3)}, 1fr)` }}
                    >
                      {awards.map((award, i) => (
                        <div key={i} className="text-center relative">
                          {/* Vertical divider between items */}
                          {i > 0 && i % Math.min(cols, 3) !== 0 && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-8 opacity-20" style={{ backgroundColor: headingColor || '#fff' }} />
                          )}
                          <p className="font-bold text-sm leading-snug" style={{ color: headingColor || '#FFFFFF' }}>
                            {award.name}
                          </p>
                          {award.subtitle && (
                            <p className="text-xs mt-0.5" style={{ color: headingColor || '#FFFFFF' }}>
                              {award.subtitle}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            // SOCIAL PROOF BAR
            if (sectionType === 'social-proof') {
              const rating = parseFloat(entry.data?.rating || '5') || 5;
              const reviewText: string = entry.data?.reviewText || '';
              const badges: { text: string }[] = (entry.data?.badges || []).filter((b: any) => b.text?.trim());
              const textCol = isDark ? '#FFFFFF' : '#111111';
              const mutedCol = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
              const dividerCol = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
              return (
                <section key={entry.id} style={sectionStyle}>
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-center flex-wrap">
                      {/* Stars + rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg key={i} viewBox="0 0 24 24" fill={i < Math.round(rating) ? '#C8A855' : 'rgba(200,168,85,0.25)'} className="w-4 h-4">
                              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                            </svg>
                          ))}
                        </div>
                        <span className="font-bold text-sm" style={{ color: textCol }}>
                          Rated {rating.toFixed(1)}{reviewText && <> across {reviewText}</>}
                        </span>
                      </div>

                      {/* Badge items with dividers */}
                      {badges.map((badge, i) => (
                        <div key={i} className="flex items-center gap-3 sm:gap-8">
                          <span className="hidden sm:block w-px h-5" style={{ backgroundColor: dividerCol }} />
                          <span className="text-sm" style={{ color: mutedCol }}>{badge.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            // CONTENT BLOCK (existing, enhanced)
            const imagePos = entry.data?.imagePosition || (idx % 2 === 0 ? 'left' : 'right');
            const hasImage = !!entry.imageUrl;
            const hasDescription = !!entry.data?.description?.trim();
            const hasTitle = !!entry.title?.trim();
            const hasText = hasTitle || !!entry.data?.subtitle || hasDescription;
            const effectivePos = hasImage && !hasDescription ? 'center' : imagePos;
            const statItems: { value: string; label: string }[] = (entry.data?.statItems || []).filter((s: any) => s.value?.trim());

            // Card styling per colour group + showBorder
            const showBorder: boolean = entry.data?.showBorder ?? false;
            const useCard = gid !== 'modern';
            // Card is transparent — the section <section> element holds the background colour.
            // Only border and rounded styling applied here; no bg-white override.
            const cardClass = 'rounded-3xl overflow-hidden';
            const cardStyle: React.CSSProperties = showBorder
              ? { border: isDark ? '1px solid rgba(255,255,255,0.14)' : `1px solid ${primaryColor}28` }
              : {};

            // No section-heading/tenant-h2 classes here — those force var(--heading-on-white)
            // via !important in globals.css, overriding the inline color we set.
            const headingClasses = 'text-3xl leading-tight mb-4 font-bold';
            const bodyClasses = isDark
              ? 'leading-relaxed whitespace-pre-line text-sm'
              : 'leading-relaxed whitespace-pre-line text-sm text-gray-600';

            const imgBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8f8f8';

            // Stat blocks rendered below content
            const statGrid = statItems.length > 0 ? (
              <div className={`grid grid-cols-2 gap-3 mt-8 ${statItems.length > 2 ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
                {statItems.map((s, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : `${primaryColor}0D` }}>
                    <p className="font-bold text-2xl leading-tight" style={{ color: isDark ? colorGroup.headingOnDark : accentOnLight }}>{s.value}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#6B7280' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            ) : null;

            const inner = hasImage && effectivePos === 'center' ? (
              <ScrollReveal delay={0}>
                {hasText ? (
                  <HomeSectionImage
                    src={entry.imageUrl}
                    alt={entry.title || ''}
                    className="w-full h-full object-contain"
                    wrapperClassName="relative overflow-hidden w-full"
                    wrapperStyle={{ maxHeight: 420, height: '56vw', backgroundColor: imgBg }}
                  />
                ) : (
                  <HomeSectionImage natural src={entry.imageUrl} alt={entry.title || ''} className="w-full h-auto block rounded-2xl" />
                )}
                {hasText && (
                  <div className={`text-center ${useCard ? 'py-10 px-8 lg:px-20' : 'py-8'}`}>
                    {entry.data?.subtitle && (
                      <p className="tenant-eyebrow mb-3 justify-center" style={{ color: isDark ? colorGroup.headingOnDark : accentOnLight }}>{entry.data.subtitle}</p>
                    )}
                    {hasTitle && (
                      <h2 className={headingClasses.replace('mb-4', 'mb-5') + ' md:text-4xl'} style={headingColor ? { color: headingColor } : {}}>
                        {entry.title}
                      </h2>
                    )}
                    {hasDescription && (
                      <>
                        <div className="w-10 h-px mb-5 mx-auto" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                        <p className={`${bodyClasses.replace('text-sm', 'text-base')} max-w-2xl mx-auto`} style={bodyColor ? { color: bodyColor } : {}}>
                          {entry.data.description}
                        </p>
                      </>
                    )}
                    {statGrid}
                  </div>
                )}
              </ScrollReveal>
            ) : hasImage ? (
              <ScrollReveal delay={0}>
                <div className={useCard ? 'px-6 sm:px-10 lg:px-14 py-10 lg:py-14' : 'py-8 px-4'}>
                  {/* Float image — text wraps beside it and continues full-width below */}
                  <div className="overflow-hidden">
                    <img
                      src={entry.imageUrl}
                      alt={entry.title || ''}
                      className={`w-full h-auto rounded-2xl object-cover block mb-5 sm:mb-0 sm:w-[44%] ${effectivePos === 'right' ? 'sm:float-left sm:mr-8 lg:mr-12' : 'sm:float-right sm:ml-8 lg:ml-12'}`}
                      style={{ maxHeight: 480 }}
                    />
                    {entry.data?.subtitle && (
                      <p className="tenant-eyebrow mb-3" style={{ color: isDark ? colorGroup.headingOnDark : accentOnLight }}>
                        {entry.data.subtitle}
                      </p>
                    )}
                    {hasTitle && (
                      <h2 className={headingClasses + ' md:text-4xl'} style={headingColor ? { color: headingColor } : {}}>
                        {entry.title}
                      </h2>
                    )}
                    {hasDescription && (
                      <>
                        <div className="w-10 h-px my-4" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                        <p className={`${bodyClasses} leading-relaxed`} style={bodyColor ? { color: bodyColor } : {}}>
                          {entry.data.description}
                        </p>
                      </>
                    )}
                    {statGrid && <div className="mt-6 clear-both">{statGrid}</div>}
                  </div>
                </div>
              </ScrollReveal>
            ) : (
              <ScrollReveal delay={0}>
                <div className={`text-center ${useCard ? 'py-14 px-8 lg:px-20' : 'py-8'}`}>
                  {entry.data?.subtitle && (
                    <p className="tenant-eyebrow mb-4 justify-center" style={{ color: isDark ? colorGroup.headingOnDark : accentOnLight }}>{entry.data.subtitle}</p>
                  )}
                  {hasTitle && (
                    <h2 className={headingClasses.replace('mb-4', 'mb-5') + ' md:text-4xl'} style={headingColor ? { color: headingColor } : {}}>
                      {entry.title}
                    </h2>
                  )}
                  {hasDescription && (
                    <>
                      <div className="w-10 h-px mb-6 mx-auto" style={{ backgroundColor: primaryColor, opacity: 0.7 }} />
                      <p
                        className={`${bodyClasses.replace('text-sm', 'text-base')} max-w-2xl mx-auto ${!isDark && (gid === 'prestige' || gid === 'artisan') ? 'italic' : ''}`}
                        style={bodyColor ? { color: bodyColor } : {}}
                      >
                        &ldquo;{entry.data.description}&rdquo;
                      </p>
                    </>
                  )}
                  {statGrid}
                </div>
              </ScrollReveal>
            );

            return (
              <section key={entry.id} className="py-8" style={sectionStyle}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                  {useCard ? <div className={cardClass} style={cardStyle}>{inner}</div> : inner}
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
            {(() => {
              const placeId = (theme as any).googlePlaceId;
              const mapUrl = (tenant as any).contactInfo?.mapUrl;
              const reviewUrl = placeId
                ? `https://search.google.com/local/writereview?placeid=${placeId}`
                : mapUrl || null;
              return (
                <div className="text-center mb-10">
                  <p className="tenant-eyebrow mb-3 justify-center" style={{ color: primaryColor }}>Reviews</p>
                  <h2 className="section-heading tenant-h2 text-3xl md:text-4xl text-gray-900">What Our Customers Say</h2>
                  {reviewUrl && (
                    <a
                      href={reviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all hover:shadow-md"
                      style={{ color: primaryColor, borderColor: primaryColor }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21.35 11.1h-9.18v2.93h5.34c-.23 1.24-.95 2.29-2.03 3l3.28 2.54c1.91-1.76 3.01-4.35 3.01-7.47 0-.58-.05-1.14-.14-1.7z" fill="#4285F4"/>
                        <path d="M11.17 22c2.7 0 4.96-.9 6.62-2.43l-3.28-2.54c-.9.6-2.04.96-3.34.96-2.57 0-4.74-1.74-5.52-4.07H2.3v2.63A9.99 9.99 0 0011.17 22z" fill="#34A853"/>
                        <path d="M5.65 13.92A5.97 5.97 0 015.35 12c0-.67.12-1.32.3-1.93V7.44H2.3A9.99 9.99 0 001.17 12c0 1.62.39 3.14 1.13 4.56l3.35-2.64z" fill="#FBBC05"/>
                        <path d="M11.17 5.97c1.45 0 2.75.5 3.77 1.48l2.83-2.83C16.13 2.99 13.87 2 11.17 2A9.99 9.99 0 002.3 7.44l3.35 2.63c.78-2.33 2.95-4.1 5.52-4.1z" fill="#EA4335"/>
                      </svg>
                      Write a Google Review
                    </a>
                  )}
                </div>
              );
            })()}
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
