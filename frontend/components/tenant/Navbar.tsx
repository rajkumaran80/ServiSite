'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Tenant } from '../../types/tenant.types';
import { PREDEFINED_PAGES, resolveNavPages } from '../../config/predefined-pages';
import { getPageTemplate } from '../../config/page-templates';
import { generateTheme } from '../../lib/theme';

interface NavbarProps {
  tenant: Tenant;
}

export const Navbar: React.FC<NavbarProps> = ({ tenant }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const themeSettings = (tenant.themeSettings as any) ?? {};
  const primaryColor = themeSettings.primaryColor || '#3B82F6';
  const theme = generateTheme(primaryColor);
  const { hoverBg, activeBg, borderColor, isLight: light } = theme;

  // 'signature' = group's curated colour — on dark bg use headingOnDark (bright), on light bg use headingOnWhite
  // 'offwhite'  = always the group's light-on-dark colour (cream, white, etc.)
  const textColorOption: 'signature' | 'offwhite' = themeSettings.textColorOption || 'signature';
  const sigColour = light
    ? (theme.group.headingOnWhite === 'var(--primary-hex)' ? primaryColor : theme.group.headingOnWhite)
    : theme.group.headingOnDark;
  // Off-White = the group's body-on-dark colour (cream for Prestige, warm light for Artisan, etc.)
  // This is always distinct from the Signature colour
  const offColour = theme.group.bodyOnDark;

  const textColor = textColorOption === 'offwhite' ? offColour : sigColour;
  const textMuted = textColor === '#FFFFFF' || textColor.startsWith('#F') || textColor.startsWith('#D') || textColor.startsWith('#C')
    ? 'rgba(255,255,255,0.65)'
    : 'rgba(0,0,0,0.58)';
  const navPages = resolveNavPages(themeSettings.navPages);
  const template = getPageTemplate(themeSettings.pageTemplate);
  const showLogo = template.showLogo !== false;

  const isRestaurantLike = ['RESTAURANT', 'CAFE'].includes(tenant.type);

  const navLinks = PREDEFINED_PAGES.filter((page) => navPages[page.key]).map((page) => {
    const label = page.key === 'menu' && !isRestaurantLike ? 'Services' : page.label;
    const href = page.slug ? `/${page.slug}` : '/';
    return { key: page.key, label, href };
  });

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: `${primaryColor}e8`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: isScrolled ? '0 4px 20px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between h-20">

            {/* Logo / Name */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              {tenant.logo ? (
                <img
                  src={tenant.logo}
                  alt={`${tenant.name} logo`}
                  className="h-12 w-auto object-contain drop-shadow-md"
                />
              ) : (
                <div className="select-none">
                  <span
                    className="font-black leading-none block"
                    style={{
                      fontFamily: 'var(--heading-font, Impact, "Arial Black", Georgia, serif)',
                      fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
                      letterSpacing: '0.05em',
                      color: textColor,
                      WebkitTextStroke: light && textColorOption === 'signature' ? '2px rgba(255,255,255,0.5)' : '2.5px rgba(0,0,0,0.55)',
                      textShadow: light && textColorOption === 'signature'
                        ? '1px 2px 0px rgba(255,255,255,0.4)'
                        : '2px 3px 0px rgba(0,0,0,0.45), 4px 5px 0px rgba(0,0,0,0.2)',
                      paintOrder: 'stroke fill',
                      transform: 'skewX(-4deg)',
                      display: 'inline-block',
                    } as React.CSSProperties}
                  >
                    {tenant.name}
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  className="px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 rounded-full"
                  onMouseEnter={() => setHoveredLink(link.key)}
                  onMouseLeave={() => setHoveredLink(null)}
                  style={{
                    letterSpacing: '0.04em',
                    fontFamily: 'var(--body-font, system-ui)',
                    color: isActive(link.href) || hoveredLink === link.key ? textColor : textMuted,
                    backgroundColor: isActive(link.href) ? activeBg : hoveredLink === link.key ? hoverBg : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTA: phone number if available, else WhatsApp */}
            {(tenant.contactInfo?.phone || tenant.whatsappNumber) && (() => {
              const phone = tenant.contactInfo?.phone;
              if (phone) {
                return (
                  <a
                    href={`tel:${phone.replace(/\s/g, '')}`}
                    className="hidden md:flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 tracking-wide"
                    style={{ letterSpacing: '0.05em', fontFamily: 'var(--body-font, system-ui)', color: textColor, border: `1px solid ${borderColor}` }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {phone}
                  </a>
                );
              }
              return (
                <a
                  href={`https://wa.me/${tenant.whatsappNumber!.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I found ${tenant.name} online.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 tracking-wide"
                  style={{ letterSpacing: '0.05em', fontFamily: 'var(--body-font, system-ui)', color: textColor, border: `1px solid ${borderColor}` }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
              );
            })()}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full transition-colors"
              style={{ color: textColor }}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div
            className="md:hidden border-t border-white/15"
            style={{
              background: `${primaryColor}f0`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    color: isActive(link.href) ? textColor : textMuted,
                    backgroundColor: isActive(link.href) ? activeBg : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              ))}
              {tenant.whatsappNumber && (
                <a
                  href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-xl transition-colors"
                  style={{ color: textMuted }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Chat on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer so content doesn't hide under fixed nav */}
      <div className="h-20" />
    </>
  );
};

export default Navbar;
