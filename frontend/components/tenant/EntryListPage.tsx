import React from 'react';
import type { PredefinedPage } from '../../config/predefined-pages';
import { EventCard } from './EventCard';
import { DjNightCard } from './DjNightCard';

interface Entry {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Record<string, any>;
}

interface Props {
  pageDef: PredefinedPage;
  entries: Entry[];
  primaryColor: string;
}

function formatDate(val: string): string {
  if (!val) return '';
  try {
    return new Date(val).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return val;
  }
}


function OfferCard({ entry, primaryColor }: { entry: Entry; primaryColor: string }) {
  const imageUrl = entry.data.imageUrl || entry.imageUrl;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col">
      {imageUrl && (
        <div className="h-44 overflow-hidden">
          <img src={imageUrl} alt={entry.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex-1">
        {entry.data.discount && (
          <div className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full mb-3 text-white" style={{ backgroundColor: primaryColor }}>
            {entry.data.discount}
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{entry.title}</h3>
        {entry.data.description && (
          <p className="text-gray-500 text-sm leading-relaxed">{entry.data.description}</p>
        )}
        {entry.data.validUntil && (
          <p className="text-xs text-gray-400 mt-3">Valid until {formatDate(entry.data.validUntil)}</p>
        )}
      </div>
    </div>
  );
}

function AboutSection({ entry }: { entry: Entry }) {
  const imageUrl = entry.data.imageUrl || entry.imageUrl;
  return (
    <div className="flex flex-col md:flex-row gap-10 items-center py-12 border-b border-gray-100 last:border-0">
      {imageUrl && (
        <div className="flex-shrink-0 w-full md:w-80">
          <img src={imageUrl} alt={entry.title} className="w-full rounded-2xl shadow-md object-cover max-h-64 md:max-h-none" />
        </div>
      )}
      <div className="flex-1">
        {entry.title && <h2 className="text-2xl font-bold text-gray-900 mb-4">{entry.title}</h2>}
        {entry.data.description && (
          <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">{entry.data.description}</p>
        )}
      </div>
    </div>
  );
}

export function EntryListPage({ pageDef, entries, primaryColor }: Props) {
  const isEmpty = entries.length === 0;

  return (
    <div>
      {/* Page header */}
      <div
        className="py-16 px-6 text-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}99)` }}
      >
        <div className="text-5xl mb-4">{pageDef.icon}</div>
        <h1 className="text-4xl font-bold text-white mb-2">{pageDef.label}</h1>
        <p className="text-white/75 text-lg">{pageDef.description}</p>
      </div>

      {/* Entries */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {isEmpty ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">{pageDef.icon}</div>
            <p className="text-xl font-medium">Nothing here yet</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        ) : pageDef.key === 'about' ? (
          <div>
            {entries.map((entry) => <AboutSection key={entry.id} entry={entry} />)}
          </div>
        ) : pageDef.key === 'dj-nights' ? (
          <div className="flex flex-col gap-6">
            {entries.map((entry) => <DjNightCard key={entry.id} entry={entry} primaryColor={primaryColor} />)}
          </div>
        ) : pageDef.key === 'offers' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => <OfferCard key={entry.id} entry={entry} primaryColor={primaryColor} />)}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {entries.map((entry) => <EventCard key={entry.id} entry={entry} primaryColor={primaryColor} />)}
          </div>
        )}
      </div>
    </div>
  );
}
