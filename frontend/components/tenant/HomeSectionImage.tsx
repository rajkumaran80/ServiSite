'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src: string;
  alt: string;
  /** When true, renders as a plain img with natural dimensions — no fixed container */
  natural?: boolean;
  className?: string;
  style?: React.CSSProperties;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export default function HomeSectionImage({ src, alt, natural, className, style, wrapperClassName, wrapperStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const lightbox = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      style={{ cursor: 'zoom-out' }}
      onClick={() => setOpen(false)}
    >
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xl transition-colors"
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        aria-label="Close"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        style={{ cursor: 'default' }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  ) : null;

  return (
    <>
      {natural ? (
        <img
          src={src}
          alt={alt}
          className={className}
          style={{ ...style, cursor: 'zoom-in' }}
          onClick={() => setOpen(true)}
        />
      ) : (
        <div
          className={wrapperClassName}
          style={{ ...wrapperStyle, cursor: 'zoom-in' }}
          onClick={() => setOpen(true)}
        >
          <img src={src} alt={alt} className={className} style={style} />
        </div>
      )}
      {mounted && createPortal(lightbox, document.body)}
    </>
  );
}
