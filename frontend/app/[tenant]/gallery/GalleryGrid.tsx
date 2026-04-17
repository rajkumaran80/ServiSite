'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { GalleryImage } from '../../../types/tenant.types';

function isVideoItem(item: GalleryImage) {
  // URL extension is the ground truth — a .mp4 URL is always a video regardless of stored mediaType
  if (/\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(item.url)) return true;
  return item.mediaType === 'video';
}

function Lightbox({
  items,
  index,
  onClose,
}: {
  items: GalleryImage[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % items.length), [items.length]);

  // When slide changes to a video, reload it
  useEffect(() => {
    if (!videoRef.current) return;
    setBuffering(false);
    videoRef.current.load();
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const item = items[current];
  const itemIsVideo = isVideoItem(item);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none z-10"
        onClick={onClose}
      >
        &times;
      </button>

      {/* Prev */}
      {items.length > 1 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-3 rounded-full hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Media */}
      <div
        className="max-w-5xl max-h-[85vh] w-full flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {itemIsVideo ? (
          <div className="relative w-full flex items-center justify-center">
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <video
              ref={videoRef}
              key={item.url}
              controls
              preload="auto"
              playsInline
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
              onCanPlay={() => setBuffering(false)}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
            >
              <source src={item.url} />
              Your browser does not support this video format.
            </video>
          </div>
        ) : (
          <div className="relative max-h-[80vh] max-w-full">
            <img
              src={item.url}
              alt={item.caption || ''}
              className="max-h-[80vh] max-w-full rounded-xl object-contain"
            />
          </div>
        )}
        {item.caption && (
          <p className="text-white/80 text-sm text-center">{item.caption}</p>
        )}
        {items.length > 1 && (
          <p className="text-white/40 text-xs">{current + 1} / {items.length}</p>
        )}
      </div>

      {/* Next */}
      {items.length > 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 p-3 rounded-full hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function GalleryGrid({ images, tenantName }: { images: GalleryImage[]; tenantName: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-6xl mb-4">📸</div>
        <h2 className="text-xl font-semibold text-gray-700">No photos yet</h2>
        <p className="text-gray-500 mt-2">Check back soon!</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {images.map((image, idx) => {
          const itemIsVideo = isVideoItem(image);
          return (
            <div
              key={image.id}
              className="break-inside-avoid bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-pointer"
              onClick={() => setLightboxIndex(idx)}
            >
              <div className="relative overflow-hidden">
                {itemIsVideo ? (
                  <div className="relative bg-black">
                    <video
                      src={`${image.url}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full object-cover group-hover:opacity-80 transition-opacity"
                      style={{ maxHeight: 320 }}
                      onLoadedMetadata={(e) => {
                        // Force browser to seek and render first frame as thumbnail
                        (e.currentTarget as HTMLVideoElement).currentTime = 0.1;
                      }}
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/80 group-hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors">
                        <svg className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={image.url}
                    alt={image.caption || `${tenantName} gallery photo`}
                    width={600}
                    height={400}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ height: 'auto' }}
                  />
                )}
              </div>
              {image.caption && (
                <div className="p-3">
                  <p className="text-sm text-gray-600">{image.caption}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
