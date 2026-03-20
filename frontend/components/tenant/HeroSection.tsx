import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Tenant } from '../../types/tenant.types';

interface HeroSectionProps {
  tenant: Tenant;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ tenant }) => {
  const tenantBase = `/${tenant.slug}`;
  const primaryColor = tenant.themeSettings?.primaryColor || '#3B82F6';

  const ctaLabel = tenant.type === 'RESTAURANT' ? 'View Menu' : 'Our Services';
  const ctaHref = `${tenantBase}/menu`;

  return (
    <section className="relative min-h-[520px] flex items-center overflow-hidden bg-gray-900">
      {/* Background image */}
      {tenant.coverImage && (
        <>
          <Image
            src={tenant.coverImage}
            alt={`${tenant.name} cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </>
      )}

      {/* Gradient fallback when no cover image */}
      {!tenant.coverImage && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}dd 0%, ${primaryColor}88 50%, #1f2937 100%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          {/* Business type badge */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full capitalize">
              {tenant.type.replace('_', ' ').toLowerCase()}
            </span>
          </div>

          {/* Business name */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            {tenant.name}
          </h1>

          {/* Tagline / description */}
          {tenant.description && (
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-8 max-w-xl">
              {tenant.description}
            </p>
          )}

          {/* Location */}
          {tenant.contactInfo?.city && (
            <p className="text-white/60 text-sm mb-8 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {tenant.contactInfo.city}
              {tenant.contactInfo.address && ` — ${tenant.contactInfo.address}`}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {ctaLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {tenant.whatsappNumber && (
              <a
                href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I'm interested in ${tenant.name}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp Us
              </a>
            )}

            <Link
              href={`${tenantBase}/contact`}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/20"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative wave bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60L1440 60L1440 20C1200 50 960 60 720 50C480 40 240 10 0 20L0 60Z" fill="white" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
