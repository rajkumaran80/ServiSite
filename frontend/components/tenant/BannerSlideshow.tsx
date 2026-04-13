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
  // Per-slide keys — only increment for the slide becoming active, so inactive
  // slides never remount and their scale stays frozen during the dissolve.
  const [slideKeys, setSlideKeys] = useState<number[]>(() => images.map(() => 0));

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % images.length;
        setSlideKeys((keys) => {
          const updated = [...keys];
          updated[next] = updated[next] + 1;
          return updated;
        });
        return next;
      });
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
          {/* key only changes when this slide becomes active — never on deactivation */}
          <div
            key={slideKeys[i]}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: `kenBurns ${interval + 2000}ms ease-in-out forwards`,
              animationPlayState: i === active ? 'running' : 'paused',
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
              onClick={() => {
                setSlideKeys((keys) => {
                  const updated = [...keys];
                  updated[i] = updated[i] + 1;
                  return updated;
                });
                setActive(i);
              }}
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
