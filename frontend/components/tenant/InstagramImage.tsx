'use client';

import { useState } from 'react';

interface InstagramImageProps {
  src: string;
  alt: string;
  className?: string;
}

const InstagramPlaceholder = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className}`} style={{ aspectRatio: '4/3', background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
    <div className="text-center p-4">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-2 opacity-80">
        <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
      <div className="text-white/80 text-xs">View on Instagram</div>
    </div>
  </div>
);

export function InstagramImage({ src, alt, className }: InstagramImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <InstagramPlaceholder className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}
