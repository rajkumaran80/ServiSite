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
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, '0')}${ampm}`;
}

interface HoursEntry { open: string; close: string; closed: boolean }

function groupOpeningHours(raw: Record<string, any>): Array<{ label: string; hours: string; closed: boolean }> {
  if (!raw || Object.keys(raw).length === 0) return [];
  const parsed: Record<string, HoursEntry> = {};
  for (const day of DAYS) {
    const v = raw[day];
    if (!v) continue;
    if (typeof v === 'object' && 'open' in v) parsed[day] = v as HoursEntry;
    else if (typeof v === 'string') {
      if (v.toLowerCase() === 'closed') parsed[day] = { open: '', close: '', closed: true };
      else parsed[day] = { open: v, close: '', closed: false };
    }
  }
  const presentDays = DAYS.filter((d) => d in parsed);
  if (presentDays.length === 0) return [];
  const hoursKey = (d: string) => {
    const e = parsed[d];
    if (!e) return '__missing__';
    return e.closed ? 'closed' : `${e.open}|${e.close}`;
  };
  const groups: Array<{ days: string[]; key: string }> = [];
  for (const day of presentDays) {
    const key = hoursKey(day);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.days.push(day);
    else groups.push({ days: [day], key });
  }
  return groups.map(({ days, key }) => {
    const label = days.length === 1
      ? DAY_SHORT[days[0]]
      : `${DAY_SHORT[days[0]]} – ${DAY_SHORT[days[days.length - 1]]}`;
    if (key === 'closed') return { label, hours: 'Closed', closed: true };
    const e = parsed[days[0]];
    const hours = e.close ? `${fmt24(e.open)} – ${fmt24(e.close)}` : e.open;
    return { label, hours, closed: false };
  });
}

function getLiveStatus(openingHours: Record<string, any>): { open: boolean; label: string } | null {
  if (!openingHours || Object.keys(openingHours).length === 0) return null;
  const now = new Date();
  const dayName = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];
  const raw = openingHours[dayName];
  if (!raw) return null;
  let entry: HoursEntry;
  if (typeof raw === 'object' && 'open' in raw) entry = raw as HoursEntry;
  else if (typeof raw === 'string') {
    if (raw.toLowerCase() === 'closed') return { open: false, label: 'Closed today' };
    entry = { open: raw, close: '', closed: false };
  } else return null;
  if (entry.closed) return { open: false, label: 'Closed today' };
  if (!entry.open) return null;
  const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return isNaN(h) ? -1 : h * 60 + (m || 0); };
  const cur = now.getHours() * 60 + now.getMinutes();
  const openMins = toMins(entry.open);
  const closeMins = entry.close ? toMins(entry.close) : -1;
  if (openMins < 0) return null;
  if (cur < openMins) return { open: false, label: `Opens ${fmt24(entry.open)}` };
  if (closeMins > 0 && cur >= closeMins) return { open: false, label: `Closed · Opens tomorrow` };
  if (closeMins > 0) return { open: true, label: `Open · Closes ${fmt24(entry.close)}` };
  return { open: true, label: 'Open now' };
}

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  facebook: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  tiktok: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  twitter: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  youtube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
};

export const Footer: React.FC<FooterProps> = ({ tenant }) => {
  const year = new Date().getFullYear();
  const contact = tenant.contactInfo;
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';
  const footerAccentSetting: 'primary' | 'gold' | 'silver' = (tenant.themeSettings as any)?.footerAccent || 'primary';
  const accentColor =
    footerAccentSetting === 'gold'   ? '#D4AF37' :
    footerAccentSetting === 'silver' ? '#CBD5E1' :
    primaryColor;
  const socialLinks = (tenant.themeSettings as any)?.socialLinks as Record<string, string> | undefined;

  const phone = tenant.whatsappNumber || contact?.phone;
  const email = contact?.email;
  const address = contact?.address
    ? [contact.address, contact.city, contact.zipCode, contact.country].filter(Boolean).join(', ')
    : null;

  const openingHours = (contact as any)?.openingHours || {};
  const hoursGroups = groupOpeningHours(openingHours);
  const liveStatus = getLiveStatus(openingHours);

  const footerTagline: string = (tenant.themeSettings as any)?.footerTagline || '';
  const footerSecondary: string = (tenant.themeSettings as any)?.footerSecondary || '';
  const footerStars: number = (tenant.themeSettings as any)?.footerStars || 0;
  const footerAward: string = (tenant.themeSettings as any)?.footerAward || '';
  const footerBadge: string = (tenant.themeSettings as any)?.footerBadge || '';

  const hasSocial = socialLinks && Object.values(socialLinks).some(Boolean);
  const hasContact = phone || email || address;
  const hasBody = hasContact || hoursGroups.length > 0;

  return (
    <footer className="bg-gray-900 text-gray-400 text-sm">
      {/* Main footer body */}
      {hasBody && (
        <div className="relative overflow-hidden">
          {/* Subtle background texture */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: `radial-gradient(circle at 20% 50%, ${primaryColor} 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${primaryColor} 0%, transparent 40%)` }} />

          <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
            <div className={`grid gap-10 items-center ${hasContact && hoursGroups.length > 0 ? 'md:grid-cols-[1fr_auto_1fr]' : ''}`}>

              {/* Left — Get In Touch */}
              {hasContact && <div className="text-center md:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.15em] mb-2" style={{ color: accentColor }}>
                  Get In Touch
                </p>
                <div className="space-y-2.5 mt-4">
                  {phone && (
                    <a href={`tel:${phone}`} className="flex items-center justify-center md:justify-start gap-3 group">
                      <span className="text-base w-5 flex-shrink-0">📞</span>
                      <p className="text-white/80 group-hover:text-white transition-colors">{phone}</p>
                    </a>
                  )}
                  {address && (
                    <div className="flex items-start justify-center md:justify-start gap-3">
                      <span className="text-base w-5 flex-shrink-0 mt-0.5">📍</span>
                      <p className="text-white/80 text-left">{address}</p>
                    </div>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="flex items-center justify-center md:justify-start gap-3 group">
                      <span className="text-base w-5 flex-shrink-0">✉️</span>
                      <p className="text-white/80 group-hover:text-white transition-colors">{email}</p>
                    </a>
                  )}
                </div>

                {(tenant.whatsappNumber || hasSocial) && (
                  <div className="flex items-center justify-center md:justify-start gap-3 mt-5 flex-wrap">
                    {tenant.whatsappNumber && (
                      <a href={`https://wa.me/${tenant.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello! I'm interested in ${tenant.name}.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                      </a>
                    )}
                    {hasSocial && Object.entries(socialLinks!).filter(([, url]) => url).map(([key, url]) =>
                      SOCIAL_ICONS[key] ? (
                        <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                          {SOCIAL_ICONS[key]}
                        </a>
                      ) : null
                    )}
                  </div>
                )}
              </div>}

              {/* Centre — Decorative text logo */}
              {hasContact && hoursGroups.length > 0 && (
                <div className={`flex flex-col items-center justify-center gap-3 select-none px-4 ${footerTagline ? '' : 'hidden md:flex'}`}>
                  {/* Top rule */}
                  <div className="w-px h-8 bg-gradient-to-b from-transparent to-white/20" />

                  {/* Full name */}
                  <p
                    className="text-2xl font-black text-center leading-tight tracking-tight"
                    style={{
                      color: 'transparent',
                      WebkitTextStroke: `1px ${accentColor}80`,
                      fontFamily: 'var(--heading-font, Georgia, serif)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tenant.name}
                  </p>

                  {/* Decorative divider */}
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${accentColor}40)` }} />
                    <span className="text-[10px]" style={{ color: `${accentColor}60` }}>✦</span>
                    <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${accentColor}40)` }} />
                  </div>

                  {/* Tagline / admin footer messages */}
                  {footerTagline ? (
                    <div className="text-center space-y-1.5 max-w-[200px]">
                      {footerStars > 0 && (
                        <p className="text-sm tracking-tight" style={{ color: '#D4AF37' }}>{'★'.repeat(footerStars)}{'☆'.repeat(5 - footerStars)}</p>
                      )}
                      {footerAward && <p className="text-[0.65rem] font-bold" style={{ color: accentColor }}>{footerAward}</p>}
                      {footerBadge && <p className="text-[0.6rem]" style={{ color: `${accentColor}80` }}>{footerBadge}</p>}
                      <p className="text-xs font-semibold leading-snug" style={{ color: accentColor }}>{footerTagline}</p>
                      {footerSecondary && <p className="text-[0.65rem] leading-snug" style={{ color: `${accentColor}99` }}>{footerSecondary}</p>}
                    </div>
                  ) : (
                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/25 text-center">
                      Good Food · Good Vibes
                    </p>
                  )}

                  {/* Bottom rule */}
                  <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
              )}

              {/* Right — Opening Hours */}
              {hoursGroups.length > 0 && (
                <div className="text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-end gap-3 mb-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: accentColor }}>
                      Opening Hours
                    </p>
                    {liveStatus && (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        liveStatus.open
                          ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                          : 'bg-red-500/15 text-red-400 border border-red-500/25'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${liveStatus.open ? 'bg-green-400' : 'bg-red-400'}`} />
                        {liveStatus.label.includes('·') ? (
                          <>
                            <span className="hidden sm:inline">{liveStatus.label}</span>
                            <span className="sm:hidden">{liveStatus.label.split('·')[1].trim()}</span>
                          </>
                        ) : liveStatus.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {hoursGroups.map(({ label, hours, closed }) => (
                      <div key={label} className="flex items-center justify-center md:justify-end gap-4">
                        <span className="text-white/50 text-sm">{label}</span>
                        <span className={`text-sm font-medium w-28 text-right ${closed ? 'text-red-400' : 'text-white/80'}`}>{hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
          <p>© {year} {tenant.name}. All rights reserved.</p>
          <p>Powered by <a href="https://www.servisite.co.uk" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors font-semibold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: 'normal', textTransform: 'none' }}>ServiSite</a></p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
