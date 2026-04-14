import React from 'react';
import Link from 'next/link';
import type { Tenant } from '../../types/tenant.types';

interface FooterProps {
  tenant: Tenant;
}

export const Footer: React.FC<FooterProps> = ({ tenant }) => {
  const tenantBase = '';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-3"
              style={{ backgroundColor: tenant.themeSettings?.primaryColor || '#3B82F6' }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-white font-bold text-lg">{tenant.name}</h3>
            <p className="text-gray-400 text-sm mt-1 capitalize">
              {tenant.type.replace('_', ' ').toLowerCase()}
            </p>
            {tenant.whatsappNumber && (
              <a
                href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                💬 WhatsApp
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href={`${tenantBase}/menu`} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {tenant.type === 'RESTAURANT' ? 'Menu' : 'Services'}
                </Link>
              </li>
              <li>
                <Link href={`${tenantBase}/gallery`} className="text-gray-400 hover:text-white text-sm transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href={`${tenantBase}/contact`} className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          {tenant.contactInfo && (
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                {(tenant.whatsappNumber || tenant.contactInfo.phone) && (
                  <li>
                    <a
                      href={`tel:${tenant.whatsappNumber || tenant.contactInfo.phone}`}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <span>📞</span> {tenant.whatsappNumber || tenant.contactInfo.phone}
                    </a>
                  </li>
                )}
                {tenant.contactInfo.email && (
                  <li>
                    <a
                      href={`mailto:${tenant.contactInfo.email}`}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <span>✉️</span> {tenant.contactInfo.email}
                    </a>
                  </li>
                )}
                {tenant.contactInfo.address && (
                  <li className="flex items-start gap-2 text-gray-400">
                    <span className="mt-0.5">📍</span>
                    <span>
                      {[tenant.contactInfo.address, tenant.contactInfo.city, tenant.contactInfo.zipCode, tenant.contactInfo.country].filter(Boolean).join(', ')}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-gray-500">
            © {year} {tenant.name}. All rights reserved.
          </p>
          <p className="text-gray-600">
            Powered by{' '}
            <a
              href="https://servisite.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ServiSite
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
