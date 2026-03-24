'use client';

import { useState, useEffect, useCallback } from 'react';

interface Entry {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Record<string, any>;
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

export function DjNightCard({ entry, primaryColor }: { entry: Entry; primaryColor: string }) {
  // Build full image list: flyer first, then gallery photos
  const allImages: string[] = [];
  if (entry.data.imageUrl) allImages.push(entry.data.imageUrl);
  else if (entry.imageUrl) allImages.push(entry.imageUrl);
  if (Array.isArray(entry.data.photos)) {
    for (const url of entry.data.photos as string[]) {
      if (url && !allImages.includes(url)) allImages.push(url);
    }
  }

  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback((i: number) => setActiveIndex(i), []);

  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % allImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [allImages.length]);

  const activeUrl = allImages[activeIndex] ?? null;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow flex flex-col md:flex-row">

      {/* ── Left: image panel ── */}
      <div className="flex-shrink-0 md:w-[45%] flex flex-col">
        {/* Main image */}
        <div className="relative overflow-hidden bg-gray-800" style={{ aspectRatio: '4/3' }}>
          {activeUrl ? (
            <img
              key={activeUrl}
              src={activeUrl}
              alt={entry.title}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 opacity-0"
              onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = '1'; }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-br from-gray-800 to-gray-900">
              🎵
            </div>
          )}

          {/* Neon glow overlay at bottom */}
          {activeUrl && (
            <div
              className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${primaryColor}33, transparent)` }}
            />
          )}

          {/* Dot indicators */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="w-1.5 h-1.5 rounded-full transition-all focus:outline-none"
                  style={{
                    backgroundColor: i === activeIndex ? primaryColor : 'rgba(255,255,255,0.3)',
                    transform: i === activeIndex ? 'scale(1.5)' : 'scale(1)',
                    boxShadow: i === activeIndex ? `0 0 6px ${primaryColor}` : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip — dark styled */}
        {allImages.length > 1 && (
          <div className="flex gap-1.5 p-2 bg-black/40 overflow-x-auto">
            {allImages.map((url, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all focus:outline-none border-2"
                style={{
                  borderColor: i === activeIndex ? primaryColor : 'transparent',
                  opacity: i === activeIndex ? 1 : 0.45,
                  boxShadow: i === activeIndex ? `0 0 8px ${primaryColor}88` : 'none',
                }}
                title={`Image ${i + 1}`}
              >
                <img src={url} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: text content ── */}
      <div className="flex-1 p-6 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-1 leading-snug">{entry.title}</h3>

        {entry.data.djName && (
          <p className="text-sm font-semibold mb-4" style={{ color: primaryColor }}>
            ft. {entry.data.djName}
          </p>
        )}

        {entry.data.date && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(entry.data.date)}{entry.data.time ? ` · ${entry.data.time}` : ''}</span>
          </div>
        )}

        {entry.data.genre && (
          <span
            className="self-start text-xs px-2.5 py-1 rounded-full mt-1 mb-4 font-medium"
            style={{ backgroundColor: `${primaryColor}22`, color: primaryColor, border: `1px solid ${primaryColor}44` }}
          >
            {entry.data.genre}
          </span>
        )}

        {entry.data.description && (
          <p className="text-gray-400 text-sm leading-relaxed flex-1 whitespace-pre-line">
            {entry.data.description}
          </p>
        )}

        {entry.data.price && (
          <div
            className="mt-5 self-start text-sm font-bold px-4 py-2 rounded-full"
            style={{ backgroundColor: `${primaryColor}22`, color: primaryColor, boxShadow: `0 0 12px ${primaryColor}33` }}
          >
            {entry.data.price}
          </div>
        )}
      </div>
    </div>
  );
}
