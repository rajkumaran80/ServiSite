'use client';

import { useState, useEffect } from 'react';

interface BannerSlideshowProps {
  images: string[];
  /** ms between transitions — default 4500 */
  interval?: number;
  className?: string;
  overlayStyle?: React.CSSProperties;
}

/**
 * Renders a full-bleed, auto-rotating background image slideshow.
 * Drop it inside a `relative` parent; it fills the parent via absolute positioning.
 */
export function BannerSlideshow({ images, interval = 4500, className = '', overlayStyle }: BannerSlideshowProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setActive((p) => (p + 1) % images.length), interval);
    return () => clearInterval(t);
  }, [images.length, interval]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            i === active ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        />
      ))}

      {/* Overlay passed from parent */}
      {overlayStyle && <div className="absolute inset-0" style={overlayStyle} />}

      {/* Dot indicators — only when multiple images */}
      {images.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
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
