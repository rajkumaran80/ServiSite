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

export function EventCard({ entry, primaryColor }: { entry: Entry; primaryColor: string }) {
  // Build the full image list: poster first, then gallery photos
  const allImages: string[] = [];
  if (entry.data.imageUrl) allImages.push(entry.data.imageUrl);
  else if (entry.imageUrl) allImages.push(entry.imageUrl);
  if (Array.isArray(entry.data.photos)) {
    for (const url of entry.data.photos as string[]) {
      if (url && !allImages.includes(url)) allImages.push(url);
    }
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const goTo = useCallback((i: number) => {
    setActiveIndex(i);
  }, []);

  // Preload images for faster display
  useEffect(() => {
    allImages.forEach((url) => {
      if (!loadedImages.has(url)) {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url));
        };
        img.src = url;
      }
    });
  }, [allImages, loadedImages]);

  // Auto-rotate every 3.5 seconds when there are multiple images
  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % allImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [allImages.length]);

  const activeUrl = allImages[activeIndex] ?? null;
  const isLoaded = activeUrl && loadedImages.has(activeUrl);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row">
      {/* ── Left: image panel ── */}
      <div className="flex-shrink-0 md:w-[45%] flex flex-col">
        {/* Main image */}
        <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
          {activeUrl ? (
            <>
              {/* Show placeholder while loading */}
              {!isLoaded && (
                <div
                  className="absolute inset-0 flex items-center justify-center text-6xl"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}44)` }}
                >
                  🎉
                </div>
              )}
              {/* Show image when loaded */}
              <img
                key={activeUrl}
                src={activeUrl}
                alt={entry.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-6xl"
              style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}44)` }}
            >
              🎉
            </div>
          )}

          {/* Slide indicators (dots) */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: i === activeIndex ? primaryColor : 'rgba(255,255,255,0.6)',
                    transform: i === activeIndex ? 'scale(1.4)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {allImages.length > 1 && (
          <div className="flex gap-1.5 p-2 bg-gray-50 overflow-x-auto">
            {allImages.map((url, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all focus:outline-none"
                style={{
                  borderColor: i === activeIndex ? primaryColor : 'transparent',
                  opacity: i === activeIndex ? 1 : 0.6,
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
        <h3 className="text-xl font-bold text-gray-900 mb-3 leading-snug">{entry.title}</h3>

        {entry.data.date && (
          <div className="flex items-center gap-2 text-sm mb-1.5 font-medium" style={{ color: primaryColor }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(entry.data.date)}
          </div>
        )}

        {entry.data.time && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {entry.data.time}
          </div>
        )}

        {entry.data.description && (
          <p className="text-gray-500 text-sm leading-relaxed flex-1 whitespace-pre-line">
            {entry.data.description}
          </p>
        )}

        {entry.data.price && (
          <div className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            {entry.data.price}
          </div>
        )}
      </div>
    </div>
  );
}
