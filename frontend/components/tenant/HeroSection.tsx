import React from 'react';
import Link from 'next/link';
import type { Tenant } from '../../types/tenant.types';
import { BannerSlideshow } from './BannerSlideshow';

export interface HeroContent {
  badgeText?: string;
  headlineLine1?: string;
  headlineLine2?: string;
  subheading?: string;
  tagline?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
}

interface HeroSectionProps {
  tenant: Tenant;
  bannerImages: string[];
  heroStyle?: 'dark' | 'centered' | 'minimal' | 'light' | 'neon' | 'typographic' | 'sunset' | 'vintage' | 'luxe' | 'power' | 'cozy' | 'magazine' | 'split' | 'cinematic' | 'geometric' | 'bold';
  primaryColor: string;
  fontFamily: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    youtube?: string;
  };
  heroContent?: HeroContent;
}

interface SocialLinksBarProps {
  links: NonNullable<HeroSectionProps['socialLinks']>;
  dark?: boolean; // true = white icons, false = dark icons
}

const SocialLinksBar: React.FC<SocialLinksBarProps> = ({ links, dark = true }) => {
  const hasAny = Object.values(links).some(Boolean);
  if (!hasAny) return null;
  const baseClass = `w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
    dark ? 'bg-white/15 hover:bg-white/30 text-white' : 'bg-black/8 hover:bg-black/15 text-gray-700'
  }`;
  return (
    <div className="flex items-center gap-2 mt-5">
      {links.instagram && (
        <a href={links.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={baseClass}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
      )}
      {links.tiktok && (
        <a href={links.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={baseClass}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
          </svg>
        </a>
      )}
      {links.twitter && (
        <a href={links.twitter} target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className={baseClass}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
      )}
      {links.youtube && (
        <a href={links.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={baseClass}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </a>
      )}
    </div>
  );
};

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ── HERO IDENTITY ───────────────────────────────────────────────────────────
// Shows logo if uploaded; otherwise renders a decorated typographic name.
const HeroIdentity: React.FC<{
  tenant: Tenant;
  primaryColor: string;
  fontFamily: string;
  dark?: boolean;   // true = white text (dark bg), false = dark text (light bg)
  center?: boolean; // centre-align everything
}> = ({ tenant, primaryColor, fontFamily, dark = true, center = false }) => {
  const textColor = dark ? '#ffffff' : '#1c1008';
  const subColor = dark ? 'rgba(255,255,255,0.5)' : `${primaryColor}99`;
  const align = center ? 'items-center justify-center' : 'items-center';

  return (
    <div className={`mb-6 select-none ${center ? 'text-center' : ''}`}>
      {/* Eyebrow */}
      {tenant.contactInfo?.city && (
        <div className={`flex ${align} gap-2 mb-3`}>
          {!center && <div className="h-px w-6 opacity-50" style={{ backgroundColor: primaryColor }} />}
          <span className="text-[0.65rem] font-bold tracking-[0.3em] uppercase" style={{ color: subColor }}>
            {tenant.contactInfo.city}
          </span>
          {!center && <div className="h-px w-6 opacity-50" style={{ backgroundColor: primaryColor }} />}
          {center && <div className="h-px w-6 opacity-50" style={{ backgroundColor: primaryColor }} />}
        </div>
      )}
      {/* Main name */}
      <h1
        className="font-black leading-[1.0] tracking-tight"
        style={{
          fontFamily: 'var(--heading-font)',
          color: textColor,
          fontSize: 'clamp(2.6rem, 6vw, 5rem)',
        }}
      >
        {tenant.name}
      </h1>
      {/* Decorated rule */}
      <div className={`flex ${align} gap-2 mt-3`}>
        <div className="h-[2px] w-10 rounded-full" style={{ backgroundColor: primaryColor }} />
        <span className="text-xs" style={{ color: primaryColor }}>✦</span>
        <div className="h-px w-5 rounded-full opacity-40" style={{ backgroundColor: primaryColor }} />
      </div>
    </div>
  );
};

// ── Custom hero text block ───────────────────────────────────────────────────
// Renders badge, custom headline, subheading and tagline when heroContent is set.
// Falls back to HeroIdentity (tenant name) when no custom content provided.
const HeroCustomContent: React.FC<{
  tenant: Tenant;
  primaryColor: string;
  fontFamily: string;
  content: HeroContent;
  dark?: boolean;
  center?: boolean;
}> = ({ tenant, primaryColor, fontFamily, content, dark = true, center = false }) => {
  const hasCustomHeadline = content.headlineLine1 || content.headlineLine2;
  const textColor = dark ? '#ffffff' : '#1c1008';
  const subColor = dark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)';
  const taglineColor = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';

  return (
    <div className={center ? 'text-center' : ''}>
      {/* Badge pill */}
      {content.badgeText && (
        <div className={`inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-5 ${center ? 'mx-auto' : ''}`}>
          <svg viewBox="0 0 24 24" fill="#C8A855" className="w-3.5 h-3.5 shrink-0">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: dark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)' }}>{content.badgeText}</span>
        </div>
      )}

      {/* Headline */}
      {hasCustomHeadline ? (
        <h1
          className="font-black leading-tight tracking-tight mb-4"
          style={{
            fontFamily: 'var(--heading-font)',
            color: textColor,
            fontSize: 'clamp(2.6rem, 6vw, 5rem)',
          }}
        >
          {content.headlineLine1}
          {content.headlineLine1 && content.headlineLine2 && <br />}
          {content.headlineLine2}
        </h1>
      ) : (
        <HeroIdentity tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} dark={dark} center={center} />
      )}

      {/* Subheading */}
      {content.subheading && (
        <p className="text-lg sm:text-xl leading-relaxed mb-3" style={{ color: subColor, fontFamily: 'var(--body-font)' }}>
          {content.subheading}
        </p>
      )}

      {/* Tagline */}
      {content.tagline && (
        <p className="text-base italic mb-6" style={{ color: taglineColor, fontFamily: 'var(--body-font)' }}>
          {content.tagline}
        </p>
      )}
    </div>
  );
};

export const HeroSection: React.FC<HeroSectionProps> = ({ tenant, bannerImages, heroStyle = 'dark', primaryColor, fontFamily, socialLinks, heroContent }) => {
  const tenantBase = ``;
  const hc: HeroContent = heroContent || {};
  const ctaLabel = hc.primaryCtaLabel || 'View Menu';
  const secondaryCtaLabel = hc.secondaryCtaLabel || 'Contact Us';
  const ctaHref = `${tenantBase}/menu`;
  const waHref = tenant.whatsappNumber
    ? `https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I'm interested in ${tenant.name}.`)}`
    : null;

  const typeLabel: Record<string, string> = {
    RESTAURANT: 'Restaurant', CAFE: 'Café', BARBER_SHOP: 'Barber Shop',
    SALON: 'Salon', GYM: 'Gym & Fitness', REPAIR_SHOP: 'Repair Shop', OTHER: 'Business',
  };

  const hasBanners = bannerImages.length > 0;

  // ── DARK (Classic) ──────────────────────────────────────────────────────────
  if (heroStyle === 'dark') {
    return (
      <section className="relative min-h-[600px] flex items-center overflow-hidden bg-gray-950">
        <BannerSlideshow
          images={bannerImages}
          overlayStyle={{
            background: hasBanners
              ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.3) 100%)'
              : `linear-gradient(135deg, #0f172a 0%, ${primaryColor}cc 60%, #0f172a 100%)`,
          }}
        />
        {!hasBanners && (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0f172a 0%, ${primaryColor}cc 60%, #0f172a 100%)` }} />
        )}
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-24 w-full">
          <div className="max-w-2xl">
            {!hc.badgeText && (
              <span className="inline-block text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-5"
                style={{ backgroundColor: `${primaryColor}bb` }}>
                {typeLabel[tenant.type] || 'Business'}
              </span>
            )}
            <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />
            {tenant.contactInfo?.city && (
              <p className="text-white/60 text-sm mb-8 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {tenant.contactInfo.address ? `${tenant.contactInfo.address}, ${tenant.contactInfo.city}` : tenant.contactInfo.city}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href={ctaHref} className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.03] shadow-xl text-base" style={{ backgroundColor: primaryColor }}>
                {ctaLabel}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </Link>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.03] shadow-xl text-base">
                  <WhatsAppIcon /> WhatsApp
                </a>
              )}
              <Link href={`${tenantBase}/contact`} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.03] border border-white/25 text-base">{secondaryCtaLabel}</Link>
            </div>
            {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10">
          <svg viewBox="0 0 1440 72" fill="none" className="w-full block">
            <path d="M0 72L1440 72L1440 28C1200 60 960 72 720 60C480 48 240 12 0 28L0 72Z" fill="white" />
          </svg>
        </div>
      </section>
    );
  }

  // ── CENTERED (Elegant) ──────────────────────────────────────────────────────
  if (heroStyle === 'centered') {
    return (
      <section className="relative min-h-[580px] flex items-center justify-center overflow-hidden text-center" style={{ backgroundColor: '#1c1008' }}>
        <BannerSlideshow
          images={bannerImages}
          overlayStyle={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.75) 100%)' }}
          className="opacity-40"
        />
        {!hasBanners && <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.75) 100%)' }} />}

        <div className="relative z-10 px-4 sm:px-6 py-24 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-16 opacity-50" style={{ backgroundColor: primaryColor }} />
            <span className="text-xs font-bold tracking-[0.25em] uppercase opacity-80 text-white">
              {typeLabel[tenant.type] || 'Restaurant'}
            </span>
            <div className="h-px w-16 opacity-50" style={{ backgroundColor: primaryColor }} />
          </div>
          <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} center={true} />
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={ctaHref}
              className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded-none border-2 transition-all hover:scale-[1.02] tracking-widest uppercase text-sm"
              style={{ borderColor: primaryColor, backgroundColor: primaryColor }}
            >
              {ctaLabel}
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white/40 hover:border-white text-white font-semibold px-8 py-3.5 rounded-none transition-all hover:scale-[1.02] tracking-widest uppercase text-sm">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
          </div>
          {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
        </div>
      </section>
    );
  }

  // ── MINIMAL (Modern) ───────────────────────────────────────────────────────
  if (heroStyle === 'minimal') {
    return (
      <section className="relative overflow-hidden bg-white border-b-4" style={{ borderColor: primaryColor }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 min-h-[560px]">
            <div className="flex flex-col justify-center py-20 pr-0 lg:pr-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-1" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  {typeLabel[tenant.type] || 'Restaurant'}
                </span>
              </div>
              <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />
              <div className="flex flex-wrap gap-3">
                <Link href={ctaHref}
                  className="inline-flex items-center gap-2 text-white font-black px-7 py-3.5 text-base transition-all hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaLabel}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black px-7 py-3.5 text-base transition-all hover:opacity-90">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
                <Link href={`${tenantBase}/contact`}
                  className="inline-flex items-center gap-2 border-2 text-gray-900 font-black px-7 py-3.5 text-base transition-all hover:bg-gray-900 hover:text-white"
                  style={{ borderColor: primaryColor }}
                >{secondaryCtaLabel}</Link>
              </div>
              {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
            </div>

            {/* Right — slideshow */}
            <div className="relative hidden lg:block">
              {hasBanners ? (
                <BannerSlideshow images={bannerImages} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-9xl" style={{ backgroundColor: `${primaryColor}10` }}>
                  🍽️
                </div>
              )}
              <div className="absolute inset-y-0 left-0 w-12" style={{ background: 'linear-gradient(to right, white, transparent)' }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── NEON (Neon Night) ───────────────────────────────────────────────────────
  if (heroStyle === 'neon') {
    return (
      <section className="relative min-h-[600px] flex items-center overflow-hidden bg-black">
        {hasBanners && (
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: 'rgba(0,0,0,0.7)' }}
            className="opacity-40"
          />
        )}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 60% 60% at 20% 50%, ${primaryColor}22 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 30%, ${primaryColor}15 0%, transparent 60%)`
        }} />
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-28 w-full">
          <p className="text-xs font-black uppercase tracking-[0.35em] mb-6" style={{ color: primaryColor }}>
            — {typeLabel[tenant.type] || 'Business'} —
          </p>
          <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />
          <div className="flex flex-wrap gap-3">
            <Link href={ctaHref}
              className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-sm text-black text-base transition-all hover:scale-[1.03]"
              style={{ backgroundColor: primaryColor, boxShadow: `0 0 20px ${primaryColor}88` }}
            >
              {ctaLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold px-8 py-3.5 rounded-sm transition-all hover:scale-[1.03] text-base">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            <Link href={`${tenantBase}/contact`}
              className="inline-flex items-center gap-2 bg-transparent border text-white font-bold px-8 py-3.5 rounded-sm transition-all hover:bg-white/5 text-base"
              style={{ borderColor: `${primaryColor}66` }}
            >{secondaryCtaLabel}</Link>
          </div>
          {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
        </div>
      </section>
    );
  }

  // ── TYPOGRAPHIC ─────────────────────────────────────────────────────────────
  if (heroStyle === 'typographic') {
    return (
      <section className="relative min-h-[580px] flex items-center bg-white border-b border-gray-100">
        {hasBanners && (
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: 'rgba(255,255,255,0.88)' }}
          />
        )}
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-24 w-full">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-10 h-0.5" style={{ backgroundColor: primaryColor }} />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">
              {typeLabel[tenant.type] || 'Business'}
            </span>
            {tenant.contactInfo?.city && (
              <>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-xs font-medium text-gray-400">{tenant.contactInfo.city}</span>
              </>
            )}
          </div>
          <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />
          <div className="flex flex-wrap gap-3">
            <Link href={ctaHref}
              className="inline-flex items-center gap-2 text-white font-black px-8 py-4 text-base transition-all hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {ctaLabel}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black px-8 py-4 text-base transition-all hover:opacity-90">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            <Link href={`${tenantBase}/contact`}
              className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-black px-8 py-4 text-base transition-all hover:bg-gray-900 hover:text-white">{secondaryCtaLabel}</Link>
          </div>
          {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
        </div>
      </section>
    );
  }

  // ── SUNSET ──────────────────────────────────────────────────────────────────
  if (heroStyle === 'sunset') {
    return (
      <section className="relative min-h-[580px] flex items-center justify-center text-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #ec4899 50%, #f97316 100%)` }}>
        {hasBanners && (
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: 'rgba(0,0,0,0.45)' }}
          />
        )}
        {!hasBanners && (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -right-20 top-0 bottom-0 w-1/3 opacity-10" style={{ background: 'linear-gradient(to bottom right, white, transparent)' }} />
            </div>
          </>
        )}
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-28">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="h-px w-10 bg-white/50" />
            <span className="text-white/80 text-xs font-black uppercase tracking-[0.3em]">{typeLabel[tenant.type] || 'Business'}</span>
            <div className="h-px w-10 bg-white/50" />
          </div>
          <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} center={true} />
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={ctaHref}
              className="inline-flex items-center gap-2 bg-white font-black px-8 py-3.5 rounded-2xl text-base transition-all hover:scale-[1.03] shadow-xl"
              style={{ color: primaryColor }}
            >
              {ctaLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold px-8 py-3.5 rounded-2xl transition-all hover:scale-[1.03] shadow-xl text-base">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            <Link href={`${tenantBase}/contact`}
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold px-8 py-3.5 rounded-2xl transition-all hover:scale-[1.03] border border-white/30 text-base">{secondaryCtaLabel}</Link>
          </div>
          {socialLinks && <div className="flex justify-center"><SocialLinksBar links={socialLinks} dark={true} /></div>}
        </div>
      </section>
    );
  }

  // ── VINTAGE (Barber Shop) ────────────────────────────────────────────────────
  if (heroStyle === 'vintage') {
    return (
      <section className="relative overflow-hidden bg-white border-b-4 border-gray-900">
        {/* Diagonal stripe background */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: `repeating-linear-gradient(45deg, ${primaryColor} 0, ${primaryColor} 2px, transparent 0, transparent 50%)`, backgroundSize: '24px 24px' }} />
        {/* Top coloured bar */}
        <div className="h-3 w-full" style={{ backgroundColor: primaryColor }} />
        <div className="h-3 w-full bg-gray-900" />
        <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />

        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 min-h-[520px]">
            {/* Left: text */}
            <div className="flex flex-col justify-center py-16 pr-0 lg:pr-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-0.5 bg-gray-900" />
                <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">
                  {typeLabel[tenant.type] || 'Barber Shop'}
                </span>
                <div className="w-8 h-0.5 bg-gray-900" />
              </div>
              <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />
              <div className="flex flex-wrap gap-3">
                <Link href={ctaHref}
                  className="inline-flex items-center gap-2 text-white font-black px-7 py-3.5 text-base transition-all hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaLabel}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black px-7 py-3.5 text-base transition-all hover:opacity-90">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
                <Link href={`${tenantBase}/contact`}
                  className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-black px-7 py-3.5 text-base transition-all hover:bg-gray-900 hover:text-white">{secondaryCtaLabel}</Link>
              </div>
              {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
            </div>

            {/* Right: image */}
            <div className="relative hidden lg:flex items-center justify-center py-10 pl-8">
              {hasBanners ? (
                <div className="relative w-full h-[420px]">
                  <BannerSlideshow images={bannerImages} />
                  <div className="absolute inset-y-0 left-0 w-10" style={{ background: 'linear-gradient(to right, white, transparent)' }} />
                </div>
              ) : (
                <div className="w-64 h-64 rounded-full flex items-center justify-center text-8xl border-8 border-gray-900"
                  style={{ backgroundColor: `${primaryColor}15` }}>
                  ✂️
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom coloured bars (mirror of top) */}
        <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />
        <div className="h-3 w-full bg-gray-900" />
        <div className="h-3 w-full" style={{ backgroundColor: primaryColor }} />
      </section>
    );
  }

  // ── LUXE (Salon) ─────────────────────────────────────────────────────────────
  if (heroStyle === 'luxe') {
    return (
      <section className="relative overflow-hidden" style={{ backgroundColor: '#faf8f5' }}>
        {/* Subtle texture */}
        <div className="absolute inset-0 pointer-events-none opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #c8a97044 1px, transparent 0)', backgroundSize: '28px 28px' }} />

        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 min-h-[600px] items-center gap-10">
            {/* Left: text */}
            <div className="py-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: primaryColor }}>
                  {typeLabel[tenant.type] || 'Salon'}
                </span>
              </div>
              <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />
              <div className="flex flex-wrap gap-3">
                <Link href={ctaHref}
                  className="inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 text-sm uppercase tracking-widest transition-all hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaLabel}
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-8 py-3.5 text-sm uppercase tracking-widest transition-all hover:opacity-90">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
                <Link href={`${tenantBase}/contact`}
                  className="inline-flex items-center gap-2 border text-gray-600 font-semibold px-8 py-3.5 text-sm uppercase tracking-widest transition-all hover:bg-gray-100"
                  style={{ borderColor: `${primaryColor}55` }}
                >{secondaryCtaLabel}</Link>
              </div>
              {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
            </div>

            {/* Right: image panel */}
            <div className="relative hidden lg:block h-full min-h-[500px]">
              {hasBanners ? (
                <>
                  <BannerSlideshow images={bannerImages} className="rounded-none" />
                  <div className="absolute inset-y-0 left-0 w-16" style={{ background: 'linear-gradient(to right, #faf8f5, transparent)' }} />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[120px] opacity-20 select-none">
                  💅
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── POWER (Gym) ──────────────────────────────────────────────────────────────
  if (heroStyle === 'power') {
    return (
      <section className="relative min-h-[600px] flex items-center overflow-hidden bg-black">
        {/* Angled colour slice */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(108deg, ${primaryColor} 0%, ${primaryColor} 35%, transparent 35%)`, opacity: 0.12 }} />
        {hasBanners && (
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: 'rgba(0,0,0,0.72)' }}
          />
        )}
        {/* Hard diagonal divider */}
        <div className="absolute top-0 bottom-0 left-0 w-[42%] pointer-events-none hidden lg:block"
          style={{ background: `linear-gradient(108deg, ${primaryColor}22 0%, ${primaryColor}08 100%)`, clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)' }} />

        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-24 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border" style={{ borderColor: primaryColor }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
              <span className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>
                {typeLabel[tenant.type] || 'Gym'}
              </span>
            </div>
            <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />
            <div className="flex flex-wrap gap-3">
              <Link href={ctaHref}
                className="inline-flex items-center gap-2 font-black px-8 py-4 text-white text-base transition-all hover:opacity-90 uppercase tracking-wide"
                style={{ backgroundColor: primaryColor }}
              >
                {ctaLabel}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </Link>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black px-8 py-4 text-base transition-all hover:opacity-90 uppercase tracking-wide">
                  <WhatsAppIcon /> WhatsApp
                </a>
              )}
              <Link href={`${tenantBase}/contact`}
                className="inline-flex items-center gap-2 border-2 text-white font-black px-8 py-4 text-base transition-all hover:bg-white/10 uppercase tracking-wide"
                style={{ borderColor: `${primaryColor}88` }}
              >{secondaryCtaLabel}</Link>
            </div>
            {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
          </div>
        </div>
      </section>
    );
  }

  // ── COZY (Café) ──────────────────────────────────────────────────────────────
  if (heroStyle === 'cozy') {
    return (
      <section className="relative overflow-hidden" style={{ backgroundColor: '#fdf6ee' }}>
        {/* Soft warm circles decoration */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 pointer-events-none"
          style={{ backgroundColor: primaryColor }} />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ backgroundColor: primaryColor }} />

        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 min-h-[560px] items-center gap-10">
            {/* Left: text */}
            <div className="py-20">
              <span
                className="inline-block text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                {typeLabel[tenant.type] || 'Café'}
              </span>
              <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />
              <div className="flex flex-wrap gap-3">
                <Link href={ctaHref}
                  className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-full transition-all hover:scale-[1.02] shadow-lg text-base"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaLabel}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-7 py-3.5 rounded-full transition-all hover:scale-[1.02] shadow-lg text-base">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
                <Link href={`${tenantBase}/contact`}
                  className="inline-flex items-center gap-2 font-bold px-7 py-3.5 rounded-full border-2 transition-all hover:scale-[1.02] text-base"
                  style={{ borderColor: `${primaryColor}55`, color: '#3d2b1f' }}
                >{secondaryCtaLabel}</Link>
              </div>
              {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
            </div>

            {/* Right: image */}
            <div className="relative hidden lg:flex items-center justify-center py-12">
              {hasBanners ? (
                <div className="relative w-full h-[420px] rounded-3xl overflow-hidden shadow-2xl">
                  <BannerSlideshow images={bannerImages} />
                </div>
              ) : (
                <div className="w-72 h-72 rounded-full flex items-center justify-center text-8xl shadow-xl border-4"
                  style={{ backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}>
                  ☕
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── MAGAZINE ────────────────────────────────────────────────────────────────
  // Full-bleed image with editorial text pinned to the bottom
  if (heroStyle === 'magazine') {
    return (
      <section className="relative min-h-[680px] flex flex-col overflow-hidden bg-gray-950">
        {/* Full-bleed background image */}
        {hasBanners ? (
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)' }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #0a0a0a 0%, ${primaryColor}66 60%, #0a0a0a 100%)` }} />
        )}

        {/* Top-left issue-style label */}
        <div className="relative z-10 pt-10 px-8 sm:px-12 lg:px-20">
          <div className="flex items-center gap-4">
            <div className="w-8 h-0.5 bg-white/40" />
            <span className="text-white/50 text-xs font-black uppercase tracking-[0.3em]">
              {typeLabel[tenant.type] || 'Restaurant'}
            </span>
          </div>
        </div>

        {/* Bottom editorial block */}
        <div className="relative z-10 mt-auto px-8 sm:px-12 lg:px-20 pb-12">
          {/* Thin colour rule */}
          <div className="w-14 h-0.5 mb-6" style={{ backgroundColor: primaryColor }} />

          <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div />
            <div className="flex flex-wrap gap-3 flex-shrink-0">
              <Link href={ctaHref}
                className="inline-flex items-center gap-2 text-black font-black px-7 py-3 text-sm uppercase tracking-wider transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                {ctaLabel}
              </Link>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black px-7 py-3 text-sm uppercase tracking-wider transition-all hover:opacity-90">
                  <WhatsAppIcon /> WhatsApp
                </a>
              )}
              <Link href={`${tenantBase}/contact`}
                className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-7 py-3 text-sm uppercase tracking-wider hover:bg-white/10 transition-all">{secondaryCtaLabel}</Link>
            </div>
          </div>
          {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
        </div>
      </section>
    );
  }

  // ── SPLIT ────────────────────────────────────────────────────────────────────
  // Exact 50/50 vertical split — solid colour left, image right
  if (heroStyle === 'split') {
    return (
      <section className="relative flex min-h-[620px] overflow-hidden">
        {/* Left half — solid colour panel */}
        <div className="relative z-10 w-full lg:w-1/2 flex flex-col justify-center px-10 sm:px-14 lg:px-16 py-20"
          style={{ backgroundColor: primaryColor }}>
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />

          <p className="relative text-white/60 text-xs font-black uppercase tracking-[0.35em] mb-6">
            {typeLabel[tenant.type] || 'Restaurant'}
          </p>
          <div className="relative">
            <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />
          </div>
          <div className="relative flex flex-col sm:flex-row gap-3">
            <Link href={ctaHref}
              className="inline-flex items-center justify-center gap-2 bg-white font-black px-7 py-3.5 text-base transition-all hover:opacity-90"
              style={{ color: primaryColor }}
            >
              {ctaLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold px-7 py-3.5 text-base transition-all hover:opacity-90">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            <Link href={`${tenantBase}/contact`}
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-7 py-3.5 text-base transition-all border border-white/30">{secondaryCtaLabel}</Link>
          </div>
          {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
        </div>

        {/* Right half — image */}
        <div className="hidden lg:block lg:w-1/2 relative">
          {hasBanners ? (
            <BannerSlideshow images={bannerImages} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[140px] opacity-20 bg-gray-100">
              🍽️
            </div>
          )}
          {/* Left-edge fade */}
          <div className="absolute inset-y-0 left-0 w-12 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
        </div>
      </section>
    );
  }

  // ── CINEMATIC ────────────────────────────────────────────────────────────────
  // Ultra-wide panoramic; text floated bottom-left; film-reel aesthetic
  if (heroStyle === 'cinematic') {
    return (
      <section className="relative overflow-hidden bg-black" style={{ minHeight: '75vh' }}>
        {/* Full-bleed image with heavy vignette */}
        {hasBanners ? (
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0.6) 100%)' }}
            className="opacity-80"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #000 0%, ${primaryColor}44 50%, #000 100%)` }} />
        )}

        {/* Letterbox bars */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-black z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-black z-10" />

        {/* Content — bottom left */}
        <div className="relative z-20 flex flex-col justify-end min-h-[75vh] pb-20 px-8 sm:px-14 lg:px-20">
          <div className="max-w-2xl">
            {/* Film-strip type badge */}
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1 border border-white/20">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span className="text-white/60 text-xs font-black uppercase tracking-[0.3em]">
                {typeLabel[tenant.type] || 'Restaurant'}
              </span>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            </div>

            <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />

            <div className="flex flex-wrap gap-3">
              <Link href={ctaHref}
                className="inline-flex items-center gap-2 font-black px-7 py-3 text-sm uppercase tracking-widest transition-all hover:opacity-90 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {ctaLabel}
              </Link>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-7 py-3 text-sm uppercase tracking-widest hover:opacity-90">
                  <WhatsAppIcon /> WhatsApp
                </a>
              )}
              <Link href={`${tenantBase}/contact`}
                className="inline-flex items-center gap-2 border border-white/25 text-white/80 font-bold px-7 py-3 text-sm uppercase tracking-widest hover:bg-white/10 transition-all">{secondaryCtaLabel}</Link>
            </div>
            {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
          </div>
        </div>
      </section>
    );
  }

  // ── GEOMETRIC ────────────────────────────────────────────────────────────────
  // No-photo abstract layout; bold overlapping shapes; design-first
  if (heroStyle === 'geometric') {
    return (
      <section className="relative min-h-[620px] flex items-center overflow-hidden bg-white">
        {/* Large circle — top right */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full pointer-events-none opacity-10"
          style={{ backgroundColor: primaryColor }} />
        {/* Small circle — bottom left */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-8"
          style={{ backgroundColor: primaryColor }} />
        {/* Diagonal rule */}
        <div className="absolute top-0 right-[38%] bottom-0 w-px pointer-events-none hidden lg:block"
          style={{ background: `linear-gradient(to bottom, transparent, ${primaryColor}40, transparent)` }} />

        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 w-full">
          <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center">
            {/* Text */}
            <div className="py-16">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">
                  {typeLabel[tenant.type] || 'Restaurant'}
                </span>
              </div>
              <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />

              <div className="flex flex-wrap gap-3">
                <Link href={ctaHref}
                  className="inline-flex items-center gap-2 text-white font-black px-8 py-4 text-base transition-all hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaLabel}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-black px-8 py-4 text-base transition-all hover:opacity-90">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
                <Link href={`${tenantBase}/contact`}
                  className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 font-black px-8 py-4 text-base hover:border-gray-400 transition-all">{secondaryCtaLabel}</Link>
              </div>
              {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
            </div>

            {/* Right: stacked accent boxes */}
            <div className="hidden lg:flex flex-col gap-4 py-16 pr-4">
              {hasBanners ? (
                <div className="relative w-72 h-[480px] rounded-2xl overflow-hidden shadow-2xl">
                  <BannerSlideshow images={bannerImages} />
                </div>
              ) : (
                <>
                  <div className="w-56 h-56 rounded-3xl flex items-center justify-center text-7xl"
                    style={{ backgroundColor: `${primaryColor}15` }}>🍽️</div>
                  <div className="w-36 h-36 rounded-3xl self-end flex items-center justify-center text-5xl"
                    style={{ backgroundColor: `${primaryColor}30` }}>✨</div>
                  <div className="w-44 h-24 rounded-3xl flex items-center justify-center text-4xl"
                    style={{ backgroundColor: `${primaryColor}10` }}>🍷</div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── BOLD ─────────────────────────────────────────────────────────────────────
  // Giant colour block takes 60% of viewport; image floated as a framed card
  if (heroStyle === 'bold') {
    return (
      <section className="relative min-h-[640px] flex overflow-hidden">
        {/* Giant left colour slab */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-[62%] pointer-events-none"
          style={{ backgroundColor: primaryColor }} />
        {/* Dot pattern on slab */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-[62%] opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 w-full">
          <div className="grid lg:grid-cols-[5fr_4fr] min-h-[640px] items-center gap-12">
            {/* Left: white text on colour */}
            <div className="py-20">
              <p className="text-white/60 text-xs font-black uppercase tracking-[0.35em] mb-8">
                {typeLabel[tenant.type] || 'Restaurant'} · Est. {new Date().getFullYear()}
              </p>
              <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={true} />
              <div className="flex flex-wrap gap-3">
                <Link href={ctaHref}
                  className="inline-flex items-center gap-2 bg-white font-black px-8 py-4 text-base transition-all hover:opacity-90 shadow-xl"
                  style={{ color: primaryColor }}
                >
                  {ctaLabel}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </Link>
                {waHref && (
                  <a href={waHref} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white font-bold px-8 py-4 text-base hover:opacity-90 shadow-xl">
                    <WhatsAppIcon /> WhatsApp
                  </a>
                )}
                <Link href={`${tenantBase}/contact`}
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-8 py-4 text-base border border-white/30 transition-all">{secondaryCtaLabel}</Link>
              </div>
              {socialLinks && <SocialLinksBar links={socialLinks} dark={true} />}
            </div>

            {/* Right: framed image card floating over the boundary */}
            <div className="hidden lg:flex items-center justify-center py-12">
              {hasBanners ? (
                <div className="relative w-full h-[440px] rounded-3xl overflow-hidden shadow-2xl ring-8 ring-white/30">
                  <BannerSlideshow images={bannerImages} />
                </div>
              ) : (
                <div className="w-72 h-80 rounded-3xl bg-white shadow-2xl flex items-center justify-center text-8xl ring-8 ring-white/20">
                  🍽️
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── LIGHT (Fresh & Natural) ─────────────────────────────────────────────────
  return (
    <section className="relative min-h-[560px] flex items-center overflow-hidden" style={{ backgroundColor: `${primaryColor}0a` }}>
      {hasBanners ? (
        <div className="absolute inset-0" style={{ opacity: 0.25 }}>
          <BannerSlideshow
            images={bannerImages}
            overlayStyle={{ background: `linear-gradient(to right, ${primaryColor}33, transparent)` }}
          />
        </div>
      ) : (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center text-[200px] opacity-10 select-none pointer-events-none">
          🌿
        </div>
      )}

      <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-24 w-full">
        <div className="max-w-xl">
          <span
            className="inline-block text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest mb-5"
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
          >
            {typeLabel[tenant.type] || 'Restaurant'}
          </span>
          <HeroCustomContent tenant={tenant} primaryColor={primaryColor} fontFamily={fontFamily} content={hc} dark={false} />
          <div className="flex flex-wrap gap-3">
            <Link href={ctaHref}
              className="inline-flex items-center gap-2 text-white font-bold px-7 py-3.5 rounded-2xl transition-all hover:scale-[1.02] shadow-lg text-base"
              style={{ backgroundColor: primaryColor }}
            >
              {ctaLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </Link>
            {waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold px-7 py-3.5 rounded-2xl transition-all hover:scale-[1.02] shadow-lg text-base">
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            <Link href={`${tenantBase}/contact`}
              className="inline-flex items-center gap-2 bg-white text-gray-700 hover:text-gray-900 font-bold px-7 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:scale-[1.02] shadow-sm text-base">{secondaryCtaLabel}</Link>
          </div>
          {socialLinks && <SocialLinksBar links={socialLinks} dark={false} />}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
