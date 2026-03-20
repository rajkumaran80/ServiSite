'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { Tenant } from '../../types/tenant.types';

interface NavbarProps {
  tenant: Tenant;
}

export const Navbar: React.FC<NavbarProps> = ({ tenant }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const tenantBase = `/${tenant.slug}`;

  const navLinks = [
    { href: tenantBase, label: 'Home' },
    { href: `${tenantBase}/menu`, label: tenant.type === 'RESTAURANT' ? 'Menu' : 'Services' },
    { href: `${tenantBase}/gallery`, label: 'Gallery' },
    { href: `${tenantBase}/contact`, label: 'Contact' },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === tenantBase) return pathname === href || pathname === tenantBase + '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`sticky top-0 z-40 transition-shadow duration-200 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Name */}
          <Link href={tenantBase} className="flex items-center gap-3 flex-shrink-0">
            {tenant.logo ? (
              <Image
                src={tenant.logo}
                alt={`${tenant.name} logo`}
                width={40}
                height={40}
                className="rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: tenant.themeSettings?.primaryColor || '#3B82F6' }}
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-gray-900 text-lg hidden sm:block">
              {tenant.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* WhatsApp CTA (Desktop) */}
          {tenant.whatsappNumber && (
            <a
              href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I found ${tenant.name} online.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span>💬</span>
              WhatsApp
            </a>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {tenant.whatsappNumber && (
              <a
                href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 text-green-600 font-medium text-sm rounded-lg hover:bg-green-50"
              >
                <span>💬</span> Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
