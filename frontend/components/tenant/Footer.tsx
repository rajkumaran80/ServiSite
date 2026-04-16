import React from 'react';
import type { Tenant } from '../../types/tenant.types';

interface FooterProps {
  tenant: Tenant;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function fmt24(t: string): string {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? `${h}${ampm}` : `${h}:${m}${ampm}`;
}

interface HoursEntry { open: string; close: string; closed: boolean }

function groupOpeningHours(raw: Record<string, any>): Array<{ label: string; hours: string }> {
  if (!raw || Object.keys(raw).length === 0) return [];

  // Normalise to {open,close,closed}
  const parsed: Record<string, HoursEntry> = {};
  for (const day of DAYS) {
    const v = raw[day];
    if (!v) continue;
    if (typeof v === 'object' && 'open' in v) {
      parsed[day] = v as HoursEntry;
    } else if (typeof v === 'string') {
      if (v.toLowerCase() === 'closed') {
        parsed[day] = { open: '', close: '', closed: true };
      } else {
        parsed[day] = { open: v, close: '', closed: false };
      }
    }
  }

  const presentDays = DAYS.filter((d) => d in parsed);
  if (presentDays.length === 0) return [];

  // Group consecutive days with identical hours
  const hoursKey = (d: string) => {
    const e = parsed[d];
    if (!e) return '__missing__';
    if (e.closed) return 'closed';
    return `${e.open}|${e.close}`;
  };

  const groups: Array<{ days: string[]; key: string }> = [];
  for (const day of presentDays) {
    const key = hoursKey(day);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], key });
    }
  }

  return groups.map(({ days, key }) => {
    const label =
      days.length === 1
        ? DAY_SHORT[days[0]]
        : `${DAY_SHORT[days[0]]} – ${DAY_SHORT[days[days.length - 1]]}`;

    if (key === 'closed') return { label, hours: 'Closed' };
    if (key === '__missing__') return { label, hours: '—' };
    const e = parsed[days[0]];
    const hours = e.close
      ? `${fmt24(e.open)} – ${fmt24(e.close)}`
      : e.open; // legacy string fallback
    return { label, hours };
  });
}

interface LiveStatus {
  open: boolean;
  label: string;
}

function getLiveStatus(openingHours: Record<string, any>): LiveStatus | null {
  if (!openingHours || Object.keys(openingHours).length === 0) return null;
  const now = new Date();
  const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Mon=0 … Sun=6
  const raw = openingHours[dayName];
  if (!raw) return null;

  let entry: HoursEntry;
  if (typeof raw === 'object' && 'open' in raw) {
    entry = raw as HoursEntry;
  } else if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'closed') return { open: false, label: 'Closed today' };
    entry = { open: raw, close: '', closed: false };
  } else {
    return null;
  }

  if (entry.closed) return { open: false, label: 'Closed today' };
  if (!entry.open) return null;

  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return isNaN(h) ? -1 : h * 60 + (m || 0);
  };

  const cur = now.getHours() * 60 + now.getMinutes();
  const openMins = toMins(entry.open);
  const closeMins = entry.close ? toMins(entry.close) : -1;

  if (openMins < 0) return null;

  if (cur < openMins) return { open: false, label: `Opens ${fmt24(entry.open)}` };
  if (closeMins > 0 && cur >= closeMins) return { open: false, label: `Closed · Opens ${fmt24(entry.open)} tomorrow` };
  if (closeMins > 0) return { open: true, label: `Open · Closes ${fmt24(entry.close)}` };
  return { open: true, label: 'Open now' };
}

export const Footer: React.FC<FooterProps> = ({ tenant }) => {
  const year = new Date().getFullYear();
  const contact = tenant.contactInfo;
  const primaryColor = tenant.themeSettings?.primaryColor || '#3B82F6';
  const socialLinks = (tenant.themeSettings as any)?.socialLinks as Record<string, string> | undefined;

  const phone = tenant.whatsappNumber || contact?.phone;
  const address = contact?.address
    ? [contact.address, contact.city, contact.zipCode, contact.country].filter(Boolean).join(', ')
    : null;

  const hoursGroups = groupOpeningHours((contact as any)?.openingHours || {});
  const liveStatus = getLiveStatus((contact as any)?.openingHours || {});

  const SOCIAL_ICONS: Record<string, React.ReactNode> = {
    instagram: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
    facebook: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    tiktok: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    twitter: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    youtube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  };

  return (
    <footer className="bg-gray-900 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Col 1 — Brand + tagline + social */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ backgroundColor: primaryColor }}>
                {tenant.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-bold">{tenant.name}</span>
            </div>
            {(tenant as any).description && (
              <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{(tenant as any).description}</p>
            )}
            {socialLinks && Object.values(socialLinks).some(Boolean) && (
              <div className="flex items-center gap-2 pt-1">
                {Object.entries(socialLinks).filter(([, v]) => v).map(([key, url]) =>
                  SOCIAL_ICONS[key] ? (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                      {SOCIAL_ICONS[key]}
                    </a>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Col 2 — Contact details */}
          {(phone || contact?.email || address) && (
            <div className="space-y-3">
              <h4 className="text-white font-semibold text-sm">Contact</h4>
              <ul className="space-y-1.5">
                {phone && (
                  <li>
                    <a href={`tel:${phone}`} className="hover:text-white transition-colors flex items-center gap-2">
                      <span>📞</span> {phone}
                    </a>
                  </li>
                )}
                {contact?.email && (
                  <li>
                    <a href={`mailto:${contact.email}`} className="hover:text-white transition-colors flex items-center gap-2">
                      <span>✉️</span> {contact.email}
                    </a>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0">📍</span>
                    <span>{address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Col 3 — Opening Hours + live badge */}
          {hoursGroups.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="text-white font-semibold text-sm">Opening Hours</h4>
                {liveStatus && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    liveStatus.open
                      ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                      : 'bg-red-500/15 text-red-400 border border-red-500/25'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${liveStatus.open ? 'bg-green-400' : 'bg-red-400'}`} />
                    {liveStatus.label}
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {hoursGroups.map(({ label, hours }) => (
                  <li key={label} className="flex justify-between gap-3">
                    <span className="text-gray-500 flex-shrink-0">{label}</span>
                    <span className={hours === 'Closed' ? 'text-red-400' : 'text-gray-300'}>{hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <p>© {year} {tenant.name}. All rights reserved.</p>
          <p>Powered by <a href="https://servisite.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 transition-colors">ServiSite</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
