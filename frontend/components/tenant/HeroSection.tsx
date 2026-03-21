import React from 'react';
import Link from 'next/link';
import type { Tenant } from '../../types/tenant.types';

interface HeroSectionProps {
  tenant: Tenant;
  heroStyle?: 'dark' | 'centered' | 'minimal' | 'light';
  primaryColor: string;
  fontFamily: string;
}

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const HeroSection: React.FC<HeroSectionProps> = ({ tenant, heroStyle = 'dark', primaryColor, fontFamily }) => {
  const tenantBase = `/${tenant.slug}`;
  const ctaLabel = tenant.type === 'RESTAURANT' ? 'View Menu' : 'Our Services';
  const ctaHref = `${tenantBase}/menu`;
  const waHref = tenant.whatsappNumber
    ? `https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I'm interested in ${tenant.name}.`)}`
    : null;

  const typeLabel: Record<string, string> = {
    RESTAURANT: 'Restaurant', CAFE: 'Café', BARBER_SHOP: 'Barber Shop',
    SALON: 'Salon', GYM: 'Gym & Fitness', REPAIR_SHOP: 'Repair Shop', OTHER: 'Business',
  };

  // ── DARK (Classic) ──────────────────────────────────────────────────────────
  if (heroStyle === 'dark') {
    return (
      <section className="relative min-h-[600px] flex items-center overflow-hidden bg-gray-950">
        {tenant.banner && (
          <img src={tenant.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: tenant.banner
              ? 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.3) 100%)'
              : `linear-gradient(135deg, #0f172a 0%, ${primaryColor}cc 60%, #0f172a 100%)`,
          }}
        />
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
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
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
        {tenant.banner && (
          <img src={tenant.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.75) 100%)' }} />

        <div className="relative z-10 px-4 sm:px-6 py-24 max-w-3xl mx-auto">
          {/* Decorative line */}
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

          {/* Gold divider */}
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
            {/* Left — text */}
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

            {/* Right — image */}
            <div className="relative hidden lg:block">
              {tenant.banner ? (
                <img src={tenant.banner} alt={tenant.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-9xl" style={{ backgroundColor: `${primaryColor}10` }}>
                  🍽️
                </div>
              )}
              {/* Bold diagonal accent */}
              <div className="absolute inset-y-0 left-0 w-12" style={{ background: `linear-gradient(to right, white, transparent)` }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── LIGHT (Fresh & Natural) ─────────────────────────────────────────────────
  return (
    <section className="relative min-h-[560px] flex items-center overflow-hidden" style={{ backgroundColor: `${primaryColor}0a` }}>
      {tenant.banner && (
        <>
          <img src={tenant.banner} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${primaryColor}33, transparent)` }} />
        </>
      )}
      {!tenant.banner && (
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
