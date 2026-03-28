import React from 'react';
import Link from 'next/link';
import type { Tenant } from '../../types/tenant.types';
import { BannerSlideshow } from './BannerSlideshow';

interface HeroSectionProps {
  tenant: Tenant;
  bannerImages: string[];
  heroStyle?: 'dark' | 'centered' | 'minimal' | 'light' | 'neon' | 'typographic' | 'sunset' | 'vintage' | 'luxe' | 'power' | 'cozy' | 'magazine' | 'split' | 'cinematic' | 'geometric' | 'bold';
  primaryColor: string;
  fontFamily: string;
}

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const HeroSection: React.FC<HeroSectionProps> = ({ tenant, bannerImages, heroStyle = 'dark', primaryColor, fontFamily }) => {
  const tenantBase = ``;
  const ctaLabel = tenant.type === 'RESTAURANT' ? 'View Menu' : 'Our Services';
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <span className="inline-block text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-5"
              style={{ backgroundColor: `${primaryColor}bb` }}>
              {typeLabel[tenant.type] || 'Business'}
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-4 tracking-tight">
              {tenant.name}
            </h1>
            <div className="w-20 h-1 rounded-full mb-6" style={{ backgroundColor: primaryColor }} />
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
              <Link href={`${tenantBase}/contact`} className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-3.5 rounded-xl transition-all hover:scale-[1.03] border border-white/25 text-base">
                Contact Us
              </Link>
            </div>
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
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
            style={{ fontFamily: `'${fontFamily}', Georgia, serif`, letterSpacing: '-0.02em' }}
          >
            {tenant.name}
          </h1>
          <p className="text-white/60 text-base mb-2 italic" style={{ fontFamily: `'${fontFamily}', Georgia, serif` }}>
            {tenant.contactInfo?.city || 'Fine Dining Experience'}
          </p>
          <div className="flex items-center justify-center gap-3 my-8">
            <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: primaryColor }} />
            <span className="text-xl" style={{ color: primaryColor }}>✦</span>
            <div className="h-px flex-1 max-w-[80px]" style={{ backgroundColor: primaryColor }} />
          </div>
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
        </div>
      </section>
    );
  }

  // ── MINIMAL (Modern) ───────────────────────────────────────────────────────
  if (heroStyle === 'minimal') {
    return (
      <section className="relative overflow-hidden bg-white border-b-4" style={{ borderColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 min-h-[560px]">
            <div className="flex flex-col justify-center py-20 pr-0 lg:pr-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-1" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  {typeLabel[tenant.type] || 'Restaurant'}
                </span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-950 leading-[0.95] tracking-tight mb-8">
                {tenant.name}
              </h1>
              {tenant.contactInfo?.city && (
                <p className="text-gray-400 text-sm mb-8 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {tenant.contactInfo.city}
                </p>
              )}
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
                >
                  Contact
                </Link>
              </div>
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 w-full">
          <p className="text-xs font-black uppercase tracking-[0.35em] mb-6" style={{ color: primaryColor }}>
            — {typeLabel[tenant.type] || 'Business'} —
          </p>
          <h1
            className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tight mb-8"
            style={{ textShadow: `0 0 40px ${primaryColor}88, 0 0 80px ${primaryColor}44` }}
          >
            {tenant.name}
          </h1>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px w-24" style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }} />
            {tenant.contactInfo?.city && (
              <span className="text-white/50 text-sm tracking-widest">{tenant.contactInfo.city}</span>
            )}
          </div>
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
            >
              Contact
            </Link>
          </div>
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
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
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black leading-[0.88] tracking-tighter mb-10 text-gray-950">
            {tenant.name.split(' ').map((word, i) => (
              <span key={i} className="block">{word}</span>
            ))}
          </h1>
          <div className="w-24 h-1.5 mb-10 rounded-full" style={{ backgroundColor: primaryColor }} />
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
              className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-black px-8 py-4 text-base transition-all hover:bg-gray-900 hover:text-white">
              Contact
            </Link>
          </div>
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
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight mb-5 drop-shadow-lg">
            {tenant.name}
          </h1>
          {tenant.contactInfo?.city && (
            <p className="text-white/70 text-base mb-10 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tenant.contactInfo.city}
            </p>
          )}
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
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold px-8 py-3.5 rounded-2xl transition-all hover:scale-[1.03] border border-white/30 text-base">
              Contact Us
            </Link>
          </div>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[0.95] tracking-tight mb-4">
                {tenant.name}
              </h1>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-14 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                {tenant.contactInfo?.city && (
                  <span className="text-sm font-medium text-gray-500">{tenant.contactInfo.city}</span>
                )}
              </div>
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
                  className="inline-flex items-center gap-2 border-2 border-gray-900 text-gray-900 font-black px-7 py-3.5 text-base transition-all hover:bg-gray-900 hover:text-white">
                  Contact
                </Link>
              </div>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 min-h-[600px] items-center gap-10">
            {/* Left: text */}
            <div className="py-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px w-12" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: primaryColor }}>
                  {typeLabel[tenant.type] || 'Salon'}
                </span>
              </div>
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] mb-5"
                style={{ fontFamily: `'${fontFamily}', Georgia, serif`, letterSpacing: '-0.02em' }}
              >
                {tenant.name}
              </h1>
              <div className="w-16 h-px mb-6" style={{ backgroundColor: primaryColor }} />
              {tenant.contactInfo?.city && (
                <p className="text-gray-500 text-sm mb-10 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {tenant.contactInfo.city}
                </p>
              )}
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
                >
                  Contact
                </Link>
              </div>
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border" style={{ borderColor: primaryColor }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
              <span className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: primaryColor }}>
                {typeLabel[tenant.type] || 'Gym'}
              </span>
            </div>
            <h1
              className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.88] tracking-tighter mb-6"
              style={{ textShadow: `4px 4px 0 ${primaryColor}44` }}
            >
              {tenant.name}
            </h1>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-1 w-20 rounded-full" style={{ backgroundColor: primaryColor }} />
              {tenant.contactInfo?.city && (
                <span className="text-white/50 text-sm uppercase tracking-widest">{tenant.contactInfo.city}</span>
              )}
            </div>
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
              >
                Contact
              </Link>
            </div>
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 min-h-[560px] items-center gap-10">
            {/* Left: text */}
            <div className="py-20">
              <span
                className="inline-block text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6"
                style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
              >
                {typeLabel[tenant.type] || 'Café'}
              </span>
              <h1
                className="text-5xl sm:text-6xl font-bold leading-[1.1] mb-4"
                style={{ fontFamily: `'${fontFamily}', Georgia, serif`, color: '#3d2b1f' }}
              >
                {tenant.name}
              </h1>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
                {tenant.contactInfo?.city && (
                  <p className="text-sm font-medium" style={{ color: `${primaryColor}99` }}>{tenant.contactInfo.city}</p>
                )}
              </div>
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
                >
                  Contact Us
                </Link>
              </div>
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

          <h1
            className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tight mb-6"
            style={{ fontFamily: `'${fontFamily}', Georgia, serif` }}
          >
            {tenant.name}
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              {tenant.contactInfo?.city && (
                <p className="text-white/50 text-sm tracking-widest uppercase mb-1">
                  {tenant.contactInfo.address ? `${tenant.contactInfo.address}, ` : ''}{tenant.contactInfo.city}
                </p>
              )}
            </div>
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
                className="inline-flex items-center gap-2 border border-white/30 text-white font-bold px-7 py-3 text-sm uppercase tracking-wider hover:bg-white/10 transition-all">
                Contact
              </Link>
            </div>
          </div>
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
          <h1 className="relative text-5xl sm:text-6xl font-black text-white leading-[1.0] tracking-tight mb-6">
            {tenant.name}
          </h1>
          {tenant.contactInfo?.city && (
            <p className="relative text-white/65 text-sm mb-10 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tenant.contactInfo.city}
            </p>
          )}
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
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-7 py-3.5 text-base transition-all border border-white/30">
              Contact
            </Link>
          </div>
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

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.88] tracking-tighter mb-4">
              {tenant.name}
            </h1>

            {tenant.contactInfo?.city && (
              <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-8">
                {tenant.contactInfo.city}
              </p>
            )}

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
                className="inline-flex items-center gap-2 border border-white/25 text-white/80 font-bold px-7 py-3 text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
                Contact
              </Link>
            </div>
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center">
            {/* Text */}
            <div className="py-16">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-black uppercase tracking-wider"
                  style={{ backgroundColor: primaryColor }}>
                  {tenant.name.charAt(0)}
                </div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">
                  {typeLabel[tenant.type] || 'Restaurant'}
                </span>
              </div>

              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-gray-950 leading-[0.88] tracking-tighter mb-8">
                {tenant.name.split(' ').map((word, i) => (
                  <span key={i} className={`block ${i % 2 === 1 ? 'ml-12' : ''}`}
                    style={i % 2 === 1 ? { WebkitTextStroke: `2px ${primaryColor}`, color: 'transparent' } : {}}>
                    {word}
                  </span>
                ))}
              </h1>

              {tenant.contactInfo?.city && (
                <p className="text-gray-400 text-sm mb-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {tenant.contactInfo.city}
                </p>
              )}

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
                  className="inline-flex items-center gap-2 border-2 border-gray-200 text-gray-700 font-black px-8 py-4 text-base hover:border-gray-400 transition-all">
                  Contact
                </Link>
              </div>
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid lg:grid-cols-[5fr_4fr] min-h-[640px] items-center gap-12">
            {/* Left: white text on colour */}
            <div className="py-20">
              <p className="text-white/60 text-xs font-black uppercase tracking-[0.35em] mb-8">
                {typeLabel[tenant.type] || 'Restaurant'} · Est. {new Date().getFullYear()}
              </p>
              <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6 drop-shadow-sm">
                {tenant.name}
              </h1>
              {tenant.contactInfo?.city && (
                <p className="text-white/60 text-sm mb-10 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {tenant.contactInfo.city}
                </p>
              )}
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
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-8 py-4 text-base border border-white/30 transition-all">
                  Contact
                </Link>
              </div>
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="max-w-xl">
          <span
            className="inline-block text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-widest mb-5"
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
          >
            {typeLabel[tenant.type] || 'Restaurant'}
          </span>
          <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-4 text-gray-900">
            {tenant.name}
          </h1>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-1 rounded-full" style={{ backgroundColor: primaryColor }} />
            {tenant.contactInfo?.city && (
              <p className="text-gray-500 text-sm">{tenant.contactInfo.city}</p>
            )}
          </div>
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
              className="inline-flex items-center gap-2 bg-white text-gray-700 hover:text-gray-900 font-bold px-7 py-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:scale-[1.02] shadow-sm text-base">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
