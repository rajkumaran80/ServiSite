'use client';

import { useEffect, useState } from 'react';

interface HoursEntry { open: string; close: string; closed: boolean }

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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

function getLiveStatus(
  openingHours: Record<string, any>,
  tenantTimezone: string,
): { open: boolean; label: string } | null {
  if (!openingHours || Object.keys(openingHours).length === 0) return null;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tenantTimezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const weekday = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';

  const dayMap: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
    friday: 4, saturday: 5, sunday: 6,
  };
  const dayName = DAYS[dayMap[weekday] ?? 0];
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
  const cur = hour * 60 + minute;
  const openMins = toMins(entry.open);
  const closeMins = entry.close ? toMins(entry.close) : -1;

  if (openMins < 0) return null;
  if (cur < openMins) return { open: false, label: `Opens ${fmt24(entry.open)}` };
  if (closeMins > 0 && cur >= closeMins) return { open: false, label: `Closed · Opens tomorrow` };
  if (closeMins > 0) return { open: true, label: `Open · Closes ${fmt24(entry.close)}` };
  return { open: true, label: 'Open now' };
}

interface Props {
  openingHours: Record<string, any>;
  timezone: string;
}

export default function LiveStatusBadge({ openingHours, timezone }: Props) {
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    const update = () => setStatus(getLiveStatus(openingHours, timezone));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [openingHours, timezone]);

  if (!status) return null;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
      status.open
        ? 'bg-green-500/15 text-green-400 border border-green-500/25'
        : 'bg-red-500/15 text-red-400 border border-red-500/25'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.open ? 'bg-green-400' : 'bg-red-400'}`} />
      {status.label.includes('·') ? (
        <>
          <span className="hidden sm:inline">{status.label}</span>
          <span className="sm:hidden">{status.label.split('·')[1].trim()}</span>
        </>
      ) : status.label}
    </span>
  );
}
