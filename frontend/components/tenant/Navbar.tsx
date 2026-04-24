'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Tenant } from '../../types/tenant.types';
import { generateTheme } from '../../lib/theme';
import { getPageTemplate } from '../../config/page-templates';

interface NavNode {
  id: string;
  label: string;
  linkType: 'INTERNAL_FEATURE' | 'CUSTOM_PAGE' | 'EXTERNAL_URL' | 'PARENT_ONLY';
  href: string | null;
  pageSlug: string | null;
  featureKey: string | null;
  openInNewTab: boolean;
  isSystemReserved: boolean;
  children: NavNode[];
}

interface NavbarProps {
  tenant: Tenant;
  navItems?: NavNode[];
}

const FEATURE_HREFS: Record<string, string> = {
  home: '/',
  contact: '/contact',
  gallery: '/gallery',
  food_menu: '/menu',
  events: '/events',
  about: '/about',
  offers: '/offers',
  'dj-nights': '/dj-nights',
};

function resolveHref(item: NavNode): string {
  if (item.linkType === 'INTERNAL_FEATURE') return FEATURE_HREFS[item.featureKey ?? ''] ?? '/';
  if (item.linkType === 'CUSTOM_PAGE') return item.pageSlug ? `/${item.pageSlug}` : '/';
  if (item.linkType === 'PARENT_ONLY') return '#'; // Return # for parent-only items
  return item.href ?? '/';
}

function DropdownMenu({
  items,
  textColor,
  textMuted,
  primaryColor,
  hoverBg,
  isOpen,
}: {
  items: NavNode[];
  textColor: string;
  textMuted: string;
  primaryColor: string;
  hoverBg: string;
  isOpen: boolean;
}) {
  if (!isOpen || items.length === 0) return null;
  return (
    <div className="absolute top-full left-0 pt-0 min-w-[180px] z-50">
      {/* transparent bridge eliminates the gap so hover stays active */}
      <div className="h-1" />
      <div
        className="rounded-xl shadow-xl py-1.5 overflow-hidden"
        style={{
          background: `${primaryColor}f2`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${hoverBg}`,
        }}
      >
        {items.map((child) => (
          <div key={child.id}>
            <Link
              href={resolveHref(child)}
              target={child.openInNewTab ? '_blank' : undefined}
              rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
              className="block px-4 py-1.5 text-sm font-semibold tracking-wide transition-colors"
              style={{
                letterSpacing: '0.04em',
                fontFamily: 'var(--body-font, system-ui)',
                color: textMuted,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = textColor; (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = textMuted; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {child.label}
            </Link>
            {child.children.length > 0 && (
              <div className="border-t border-gray-200/20">
                {child.children.map((grandchild) => (
                  <Link
                    key={grandchild.id}
                    href={resolveHref(grandchild)}
                    target={grandchild.openInNewTab ? '_blank' : undefined}
                    rel={grandchild.openInNewTab ? 'noopener noreferrer' : undefined}
                    className="block px-6 py-1 text-sm font-medium tracking-wide transition-colors"
                    style={{
                      letterSpacing: '0.04em',
                      fontFamily: 'var(--body-font, system-ui)',
                      color: textMuted,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = textColor; (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = textMuted; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    {grandchild.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DesktopNavItem({
  item,
  isActive,
  textColor,
  textMuted,
  primaryColor,
  hoverBg,
  activeBg,
}: {
  item: NavNode;
  isActive: (href: string) => boolean;
  textColor: string;
  textMuted: string;
  primaryColor: string;
  hoverBg: string;
  activeBg: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const href = resolveHref(item);
  const hasChildren = item.children.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isParentOnly = item.linkType === 'PARENT_ONLY' && hasChildren;
  
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {isParentOnly ? (
        // Render as button for parent-only items with children
        <button
          className="flex items-center gap-1 px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 rounded-full cursor-pointer"
          style={{
            letterSpacing: '0.04em',
            fontFamily: 'var(--body-font, system-ui)',
            color: open ? textColor : textMuted,
            backgroundColor: open ? hoverBg : 'transparent',
            border: 'none',
            background: open ? hoverBg : 'transparent',
          }}
        >
          {item.label}
          {hasChildren && (
            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      ) : (
        // Render as Link for all other items
        <Link
          href={href}
          target={item.openInNewTab ? '_blank' : undefined}
          rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
          className="flex items-center gap-1 px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 rounded-full"
          style={{
            letterSpacing: '0.04em',
            fontFamily: 'var(--body-font, system-ui)',
            color: isActive(href) || open ? textColor : textMuted,
            backgroundColor: isActive(href) ? activeBg : open ? hoverBg : 'transparent',
          }}
        >
          {item.label}
          {hasChildren && (
            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </Link>
      )}
      {hasChildren && (
        <DropdownMenu
          items={item.children}
          textColor={textColor}
          textMuted={textMuted}
          primaryColor={primaryColor}
          hoverBg={hoverBg}
          isOpen={open}
        />
      )}
    </div>
  );
}

export const Navbar: React.FC<NavbarProps> = ({ tenant, navItems = [] }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const themeSettings = (tenant.themeSettings as any) ?? {};
  const primaryColor = themeSettings.primaryColor || '#3B82F6';
  const theme = generateTheme(primaryColor);
  const { hoverBg, activeBg, borderColor, isLight: light } = theme;

  const textColorOption: 'signature' | 'offwhite' = themeSettings.textColorOption || 'signature';
  const sigColour = light
    ? (theme.group.headingOnWhite === 'var(--primary-hex)' ? primaryColor : theme.group.headingOnWhite)
    : theme.group.headingOnDark;
  const offColour = theme.group.bodyOnDark;
  const textColor = textColorOption === 'offwhite' ? offColour : sigColour;
  const textMuted = textColor === '#FFFFFF' || textColor.startsWith('#F') || textColor.startsWith('#D') || textColor.startsWith('#C')
    ? 'rgba(255,255,255,0.65)'
    : 'rgba(0,0,0,0.58)';

  const template = getPageTemplate(themeSettings.pageTemplate);
  const showLogo = template.showLogo !== false;
  const logoDisplay: 'logo' | 'text' | 'both' = themeSettings.logoDisplay || (tenant.logo ? 'logo' : 'text');
  const showLogoImage = tenant.logo && (logoDisplay === 'logo' || logoDisplay === 'both');
  const showLogoText  = logoDisplay === 'text' || logoDisplay === 'both';

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
            <Link href="/" className="flex items-center gap-1 flex-shrink-0 mr-8">
              {showLogoImage && (
                <img
                  src={tenant.logo!}
                  alt={`${tenant.name} logo`}
                  className="h-14 w-auto object-contain drop-shadow-lg brightness-110 contrast-105 py-1"
                />
              )}
              {showLogoText && (
                <div className="select-none">
                  <span
                    className="font-black leading-none block"
                    style={{
                      fontFamily: 'var(--heading-font, Impact, "Arial Black", Georgia, serif)',
                      fontSize: showLogoImage ? 'clamp(1rem, 2vw, 1.4rem)' : 'clamp(1.5rem, 3.5vw, 2rem)',
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
              {navItems.map((item) => (
                <DesktopNavItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  textColor={textColor}
                  textMuted={textMuted}
                  primaryColor={primaryColor}
                  hoverBg={hoverBg}
                  activeBg={activeBg}
                />
              ))}
            </div>

            {/* Desktop CTA */}
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
              {navItems.map((item) => {
                const href = resolveHref(item);
                return (
                  <React.Fragment key={item.id}>
                    <Link
                      href={href}
                      target={item.openInNewTab ? '_blank' : undefined}
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                      style={{
                        color: isActive(href) ? textColor : textMuted,
                        backgroundColor: isActive(href) ? activeBg : 'transparent',
                      }}
                    >
                      {item.label}
                    </Link>
                    {item.children.map((child) => (
                      <React.Fragment key={child.id}>
                        <Link
                          href={resolveHref(child)}
                          target={child.openInNewTab ? '_blank' : undefined}
                          onClick={() => setIsMenuOpen(false)}
                          className="block pl-8 pr-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                          style={{ color: textMuted }}
                        >
                          {child.label}
                        </Link>
                        {child.children.map((grandchild) => (
                          <Link
                            key={grandchild.id}
                            href={resolveHref(grandchild)}
                            target={grandchild.openInNewTab ? '_blank' : undefined}
                            onClick={() => setIsMenuOpen(false)}
                            className="block pl-12 pr-4 py-2 rounded-xl text-sm font-normal transition-colors"
                            style={{ color: textMuted }}
                          >
                            {grandchild.label}
                          </Link>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
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

      <div className="h-20" />
    </>
  );
};

export default Navbar;
