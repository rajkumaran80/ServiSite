'use client';

import { useState, useEffect } from 'react';

interface BannerSlideshowProps {
  images: string[];
  /** ms per slide — default 5000 */
  interval?: number;
  className?: string;
  overlayStyle?: React.CSSProperties;
}

/**
 * Full-bleed, auto-rotating background slideshow with Ken Burns zoom + fade crossfade.
 * Drop inside a `relative` parent; fills the parent via absolute positioning.
 */
export function BannerSlideshow({ images, interval = 5000, className = '', overlayStyle }: BannerSlideshowProps) {
  const [active, setActive] = useState(0);
  const [slideKey, setSlideKey] = useState(0); // increments on each transition to restart Ken Burns

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setActive((p) => (p + 1) % images.length);
      setSlideKey((p) => p + 1);
    }, interval);
    return () => clearInterval(t);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes kenBurns {
          from { transform: scale(1); }
          to   { transform: scale(1.08); }
        }
      `}</style>

      {images.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 overflow-hidden ${className}`}
          style={{
            opacity: i === active ? 1 : 0,
            transition: 'opacity 2000ms ease-in-out',
          }}
        >
          {/* Separate inner div so we can restart the animation via key change */}
          <div
            key={i === active ? slideKey : `idle-${i}`}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: i === active
                ? `kenBurns ${interval + 2000}ms ease-in-out forwards`
                : 'none',
            }}
          />
        </div>
      ))}

      {/* Overlay passed from parent (dark gradient, colour tint, etc.) */}
      {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}

      {/* Dot indicators — only when multiple images */}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActive(i); setSlideKey((p) => p + 1); }}
              aria-label={`Banner ${i + 1}`}
              className="w-2 h-2 rounded-full transition-all duration-300 focus:outline-none"
              style={{
                backgroundColor: i === active ? 'white' : 'rgba(255,255,255,0.4)',
                transform: i === active ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
