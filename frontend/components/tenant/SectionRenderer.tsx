'use client';

import React, { useState, useEffect } from 'react';
import type {
  PageSection,
  HeroContent,
  TextContent,
  ImageTextContent,
  FeaturesContent,
  GalleryContent,
  CtaContent,
  ContactInfoContent,
  DataTableContent,
  AwardsContent,
  SocialMediaContent,
  GoogleReviewsContent,
  ReviewButtonsContent,
  ImageOnlyContent,
} from '../../types/page.types';
import { getColorGroup, SECTION_BG_PALETTES, type SectionBgMode } from '../../lib/theme';

interface Props {
  section: PageSection;
  primaryColor?: string;
  themeSettings?: any;
}

function renderText(text: string) {
  // Simple inline markdown: **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function HeroSection({ content, primaryColor }: { content: HeroContent; primaryColor?: string }) {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
      {content.imageUrl && (
        <>
          <img
            src={content.imageUrl}
            alt={content.heading}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {content.overlay !== false && (
            <div className="absolute inset-0 bg-black/50" />
          )}
        </>
      )}
      {!content.imageUrl && (
        <div
          className="absolute inset-0"
          style={{
            background: primaryColor
              ? `linear-gradient(135deg, ${primaryColor}dd, ${primaryColor}88)`
              : 'linear-gradient(135deg, #1e3a5f, #0f1f35)',
          }}
        />
      )}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto py-20">
        <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">{content.heading}</h1>
        {content.subheading && (
          <p className="text-xl text-white/85 mb-8 drop-shadow">{content.subheading}</p>
        )}
        {content.buttonLabel && content.buttonHref && (
          <a
            href={content.buttonHref}
            className="inline-block bg-white text-gray-900 font-bold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors shadow-lg"
          >
            {content.buttonLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function TextSection({ content }: { content: TextContent }) {
  const alignClass =
    content.align === 'center'
      ? 'text-center'
      : content.align === 'right'
      ? 'text-right'
      : 'text-left';

  return (
    <section className={`py-16 px-6 max-w-3xl mx-auto ${alignClass}`}>
      {content.heading && (
        <h2 className="text-3xl font-bold text-gray-900 mb-6">{content.heading}</h2>
      )}
      <div className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
        {content.body.split('\n').map((line, i) => (
          <p key={i} className={line === '' ? 'mt-4' : ''}>
            {renderText(line)}
          </p>
        ))}
      </div>
    </section>
  );
}

function ImageTextSection({ content, primaryColor }: { content: ImageTextContent; primaryColor?: string }) {
  const isRight = content.imagePosition === 'right';
  return (
    <section className="py-16 px-6">
      <div className={`max-w-6xl mx-auto flex flex-col ${isRight ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center`}>
        {content.imageUrl && (
          <div className="flex-1">
            <img
              src={content.imageUrl}
              alt={content.imageAlt || content.heading || ''}
              className="w-full rounded-2xl shadow-lg object-cover max-h-[400px]"
            />
          </div>
        )}
        <div className="flex-1">
          {content.heading && (
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{content.heading}</h2>
          )}
          <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">{content.body}</p>
          {content.buttonLabel && content.buttonHref && (
            <a
              href={content.buttonHref}
              className="inline-block mt-6 px-6 py-3 rounded-lg text-white font-semibold transition-colors"
              style={{ backgroundColor: primaryColor || '#3B82F6' }}
            >
              {content.buttonLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection({ content, primaryColor }: { content: FeaturesContent; primaryColor?: string }) {
  const cols = content.columns ?? 3;
  const gridClass =
    cols === 2
      ? 'md:grid-cols-2'
      : cols === 4
      ? 'md:grid-cols-4'
      : 'md:grid-cols-3';

  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {content.heading && (
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{content.heading}</h2>
            {content.subheading && <p className="text-gray-500 text-lg">{content.subheading}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 ${gridClass} gap-8`}>
          {content.features.map((feature, i) => (
            <div key={i} className="text-center p-6 bg-white rounded-2xl shadow-sm">
              {feature.icon && <div className="text-4xl mb-4">{feature.icon}</div>}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ content }: { content: GalleryContent }) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {content.heading && (
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{content.heading}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {content.images.map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl group">
              <img
                src={img.url}
                alt={img.caption || `Gallery image ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {img.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-sm px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ content, primaryColor }: { content: CtaContent; primaryColor?: string }) {
  const isDark = content.variant === 'dark';
  const bg = isDark ? 'bg-gray-900' : content.variant === 'light' ? 'bg-gray-50' : '';
  const bgStyle = !isDark && content.variant !== 'light' ? { backgroundColor: primaryColor || '#3B82F6' } : {};
  const textColor = isDark || content.variant !== 'light' ? 'text-white' : 'text-gray-900';
  const btnClass = isDark
    ? 'bg-white text-gray-900 hover:bg-gray-100'
    : content.variant === 'light'
    ? 'text-white'
    : 'bg-white/15 border border-white/30 text-white hover:bg-white/25';
  const btnStyle = content.variant === 'light' ? { backgroundColor: primaryColor || '#3B82F6' } : {};

  return (
    <section className={`py-20 px-6 text-center ${bg}`} style={bgStyle}>
      <div className="max-w-2xl mx-auto">
        <h2 className={`text-4xl font-bold mb-4 ${textColor}`}>{content.heading}</h2>
        {content.subheading && (
          <p className={`text-lg mb-8 ${isDark ? 'text-gray-300' : content.variant === 'light' ? 'text-gray-500' : 'text-white/80'}`}>
            {content.subheading}
          </p>
        )}
        <a
          href={content.buttonHref}
          className={`inline-block px-8 py-4 rounded-full font-bold text-lg transition-colors ${btnClass}`}
          style={btnStyle}
        >
          {content.buttonLabel}
        </a>
      </div>
    </section>
  );
}

function ContactInfoSection({ content }: { content: ContactInfoContent }) {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {content.heading && (
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{content.heading}</h2>
        )}
        <p className="text-gray-500 text-center">Contact information will be displayed here from your contact settings.</p>
      </div>
    </section>
  );
}

function DividerSection() {
  return (
    <div className="py-8 px-6">
      <hr className="max-w-6xl mx-auto border-gray-200" />
    </div>
  );
}

function DataTableSection({ content, primaryColor }: { content: DataTableContent; primaryColor?: string }) {
  const hasHeaders = content.headers?.some((h) => h.trim());
  const rows = content.rows ?? [];
  const color = primaryColor || '#3B82F6';
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {content.heading && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{content.heading}</h2>
            {content.subheading && <p className="text-gray-500">{content.subheading}</p>}
          </div>
        )}
        <div className={`overflow-x-auto rounded-2xl ${content.showBorder ? 'border border-gray-200' : 'shadow-sm'}`}>
          <table className="w-full text-sm">
            {hasHeaders && (
              <thead>
                <tr style={{ backgroundColor: color }}>
                  {content.headers.map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-left font-semibold text-white first:rounded-tl-2xl last:rounded-tr-2xl">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={content.striped && ri % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-5 py-3.5 text-gray-700 border-b border-gray-100 last-of-type:border-b-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={Math.max(content.headers?.length ?? 1, 1)} className="px-5 py-8 text-center text-gray-400">
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AwardsSection({ content, primaryColor }: { content: AwardsContent; primaryColor?: string }) {
  const defaultBg = primaryColor ? `${primaryColor}cc` : '#1f2937';
  const bgColor = content.backgroundColor || defaultBg;
  const textColor = content.textColor || '#ffffff';

  return (
    <section className="py-6 overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {content.awards.map((award, index) => (
            <div key={index} className="text-center">
              <p className="font-caviar font-bold text-white text-sm" style={{ color: textColor, fontFamily: 'var(--heading-font, Georgia, serif)' }}>
                {award.title}
              </p>
              {award.subtitle && (
                <p className="text-sage-200 text-xs mt-0.5" style={{ color: `${textColor}cc` }}>
                  {award.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SocialMediaSection({ content, primaryColor }: { content: SocialMediaContent; primaryColor?: string }) {
  const defaultBg = '#f5f5f4'; // sage-50 equivalent
  const bgColor = content.backgroundColor || defaultBg;
  const [livePosts, setLivePosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always fetch live posts
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let posts = [];
        
        if (content.platform === 'instagram') {
          // Use Instagram service API (cached)
          const response = await fetch('/api/instagram/media/cached');
          if (response.ok) {
            const data = await response.json();
            posts = data.data.map((item: any) => ({
              id: item.id,
              imageUrl: item.imageUrl,
              caption: item.caption,
              timestamp: new Date(item.timestamp).toLocaleString(),
              isVideo: item.isVideo,
              postUrl: item.postUrl
            }));
          }
        } else if (content.platform === 'facebook') {
          // Use Facebook service API (cached)
          const response = await fetch('/api/facebook/posts/cached');
          if (response.ok) {
            const data = await response.json();
            posts = data.data.map((item: any) => ({
              id: item.id,
              imageUrl: item.imageUrl,
              caption: item.message || '',
              timestamp: new Date(item.created_time).toLocaleString(),
              isVideo: false,
              postUrl: item.permalink_url
            }));
          }
        }
        
        setLivePosts(posts);
      } catch (err) {
        console.error('Failed to fetch social media posts:', err);
        setError('Failed to load live posts');
        // Set empty array as fallback since manual posts are removed
        setLivePosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
    
    // Set up refresh interval
    if (content.refreshInterval && content.refreshInterval > 0) {
      const interval = setInterval(fetchPosts, content.refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [content.platform, content.maxPosts, content.refreshInterval]);

  // Always use live posts
  const displayPosts = livePosts.slice(0, content.maxPosts || 6);

  return (
    <section className="pt-16 pb-10 lg:pt-20 lg:pb-12 overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <a 
            href={content.profileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-3 mb-3 hover:opacity-80 transition-opacity"
            aria-label={`Open ${content.username} on ${content.platform}`}
          >
            {content.platform === 'instagram' && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" style={{ color: primaryColor || '#059669' }}>
                <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            )}
            <p className="font-caviar font-bold text-xl tracking-wide" style={{ fontFamily: 'var(--heading-font, Georgia, serif)', color: '#374151' }}>
              {content.heading || 'Latest from the Kitchen'}
            </p>
          </a>
          {content.subheading && (
            <p className="text-gray-600 max-w-lg mx-auto">{content.subheading}</p>
          )}
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mb-10">
          {isLoading ? (
            // Loading state
            Array.from({ length: content.maxPosts || 6 }).map((_, index) => (
              <div key={`loading-${index}`} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                  </div>
                </div>
                <div className="w-full h-64 bg-gray-200 animate-pulse"></div>
                <div className="flex items-center gap-4 px-3 pt-3 pb-1">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse ml-auto"></div>
                </div>
                <div className="px-3 pb-3 pt-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
              </div>
            ))
          ) : displayPosts.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-500 mb-4">
                {error ? 'Failed to load posts from social media.' : 'Connect your social media accounts to display posts here.'}
              </p>
              <p className="text-sm text-gray-400">
                Go to Dashboard Settings → Social to connect your accounts
              </p>
            </div>
          ) : (
            // Display posts
            displayPosts.map((post: any) => (
            <div key={post.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 flex flex-col">
              {/* Post Header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                {content.profileImageUrl && (
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-gray-200">
                    <img 
                      alt={content.username} 
                      loading="lazy" 
                      width="32" 
                      height="32" 
                      className="w-full h-full object-cover" 
                      src={content.profileImageUrl}
                    />
                  </div>
                )}
                <a 
                  href={post.postUrl || (post.isVideo ? post.videoUrl : `${content.profileUrl}/p/${post.id}/`)}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 min-w-0 text-sm leading-tight hover:opacity-80 transition-opacity"
                >
                  <span className="font-semibold" style={{ color: '#374151' }}>{content.username}</span>
                  <span className="text-gray-400"> · {post.timestamp}</span>
                </a>
                <a 
                  href={post.postUrl || (post.isVideo ? post.videoUrl : `${content.profileUrl}/p/${post.id}/`)}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-700 hover:text-gray-500 transition-colors shrink-0" 
                  aria-label={`View on ${content.platform}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <circle cx="5" cy="12" r="1.5"></circle>
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="19" cy="12" r="1.5"></circle>
                  </svg>
                </a>
              </div>

              {/* Post Image/Video */}
              <button 
                type="button" 
                className="relative w-full block bg-gray-50 focus:outline-none" 
                aria-label={post.caption}
                onClick={() => window.open(post.postUrl || (post.isVideo ? post.videoUrl : `${content.profileUrl}/p/${post.id}/`), '_blank')}
              >
                {post.isVideo ? (
                  <div className="relative">
                    <img 
                      src={post.imageUrl} 
                      alt={post.caption}
                      className="w-full h-auto block"
                    />
                    <span className="absolute top-3 right-3 text-white pointer-events-none" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }} aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7">
                        <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm2 5.5v7l6-3.5-6-3.5z"></path>
                      </svg>
                    </span>
                  </div>
                ) : (
                  <img 
                    src={post.imageUrl} 
                    alt={post.caption}
                    className="w-full h-auto block"
                  />
                )}
              </button>

              {/* Engagement Actions */}
              <div className="flex items-center gap-4 px-3 pt-3 pb-1">
                <a 
                  href={post.postUrl || `${content.profileUrl}/p/${post.id}/`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-700 hover:text-gray-500 transition-colors" 
                  aria-label={`Like on ${content.platform}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                    <path d="M20.84 4.61a5.5 5.0 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.0 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.0 0 0 0 0-7.78z"></path>
                  </svg>
                </a>
                <a 
                  href={post.postUrl || `${content.profileUrl}/p/${post.id}/`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-700 hover:text-gray-500 transition-colors" 
                  aria-label={`Comment on ${content.platform}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                    <path d="M21 11.5a8.38 8.0 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.0 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.0 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.0 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </a>
                <a 
                  href={post.postUrl || `${content.profileUrl}/p/${post.id}/`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-700 hover:text-gray-500 transition-colors" 
                  aria-label={`Share on ${content.platform}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </a>
                <a 
                  href={post.postUrl || `${content.profileUrl}/p/${post.id}/`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-auto text-gray-700 hover:text-gray-500 transition-colors" 
                  aria-label={`Save on ${content.platform}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[22px] h-[22px]">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                </a>
              </div>

              {/* Caption */}
              <div className="px-3 pb-3 pt-2 text-sm leading-relaxed" style={{ color: '#374151' }}>
                <span className="font-semibold">{content.username}</span>{' '}
                <span className="whitespace-pre-wrap">
                  {post.caption.length > 100 ? `${post.caption.substring(0, 100)}...` : post.caption}
                </span>
                {post.caption.length > 100 && (
                  <button 
                    type="button" 
                    className="text-gray-500 hover:text-gray-700 transition-colors ml-1"
                    onClick={() => window.open(post.postUrl || `${content.profileUrl}/p/${post.id}/`, '_blank')}
                  >
                    more
                  </button>
                )}
              </div>
            </div>
          )))}
        </div>

        {/* Follow Button */}
        {content.showFollowButton !== false && (
          <div className="text-center">
            <a 
              href={content.profileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-full transition-colors"
              style={{ backgroundColor: primaryColor || '#059669', color: 'white' }}
            >
              {content.platform === 'instagram' && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <rect x="3" y="3" width="18" height="18" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              )}
              @{content.username}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function renderSourceBadge(source: string) {
  switch (source) {
    case 'google':
      return (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-xs text-gray-400">Google</span>
        </div>
      );
    case 'tripadvisor':
      return (
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-3 h-3 rounded-full text-white text-[5px] font-bold leading-none" style={{ backgroundColor: '#00AF87' }}>TA</span>
          <span className="text-xs text-gray-400">TripAdvisor</span>
        </div>
      );
    case 'facebook':
      return (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-xs text-gray-400">Facebook</span>
        </div>
      );
    case 'instagram':
      return (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="url(#igGrad)">
            <defs>
              <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f09433"/>
                <stop offset="25%" stopColor="#e6683c"/>
                <stop offset="50%" stopColor="#dc2743"/>
                <stop offset="75%" stopColor="#cc2366"/>
                <stop offset="100%" stopColor="#bc1888"/>
              </linearGradient>
            </defs>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
          <span className="text-xs text-gray-400">Instagram</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span className="text-xs text-gray-400">Review</span>
        </div>
      );
  }
}

function GoogleReviewsSection({ content, primaryColor, googlePlaceId: placeIdProp, socialLinks }: { content: GoogleReviewsContent; primaryColor?: string; googlePlaceId?: string; socialLinks?: any }) {
  const defaultBg = '#f5f5f4'; // sage-50 equivalent
  const bgColor = content.backgroundColor || defaultBg;
  const [googleReviews, setGoogleReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googlePlaceId = placeIdProp || '';

  // Fetch Google reviews
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/google-reviews');
        if (response.ok) {
          const data = await response.json();
          let filtered = data.data || [];
          if (content.minRating && content.minRating > 0) {
            filtered = filtered.filter((r: any) => r.rating >= content.minRating!);
          }
          setGoogleReviews(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch Google reviews:', err);
        setError('Failed to load reviews');
        setGoogleReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [content.maxReviews, content.minRating]);

  // Merge Google auto-fetched + manual reviews
  const manualReviews = (content.manualReviews || []).map((r: any) => ({
    authorName: r.authorName,
    rating: r.rating,
    text: r.text,
    time: r.time || '',
    profilePhotoUrl: r.profilePhotoUrl || '',
    reviewUrl: r.reviewUrl || '',
    source: r.platform || 'other',
  }));

  const maxReviews = content.maxReviews || 6;
  const googleSlots = Math.max(0, maxReviews - manualReviews.length);
  const reviews = [
    ...googleReviews.slice(0, googleSlots).map((r: any) => ({ ...r, source: 'google' })),
    ...manualReviews,
  ];

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <section className="pt-16 pb-10 lg:pt-20 lg:pb-12 overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="font-caviar font-bold text-2xl lg:text-3xl tracking-wide mb-3" style={{ fontFamily: 'var(--heading-font, Georgia, serif)', color: primaryColor }}>
            {content.heading || 'What Our Customers Say'}
          </h2>
          {content.subheading && (
            <p className="text-gray-600 max-w-lg mx-auto">{content.subheading}</p>
          )}
        </div>

        {/* Reviews Container */}
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {isLoading && manualReviews.length === 0 ? (
                // Loading state — only show skeletons if no manual reviews to show yet
                Array.from({ length: content.maxReviews || 6 }).map((_, index) => (
                  <div key={`loading-${index}`} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse flex-shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-3"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : reviews.length === 0 ? (
                // Empty state
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                  <p className="text-gray-500 mb-4">
                    {error ? 'Failed to load Google reviews.' : 'Add your Google Place ID in Contact settings to display reviews, or add manual reviews in the page builder.'}
                  </p>
                </div>
              ) : (
                // Display reviews
                reviews.map((review, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100 ${review.reviewUrl ? 'cursor-pointer' : ''}`}
                    onClick={() => review.reviewUrl && window.open(review.reviewUrl, '_blank')}
                  >
                    <div className="flex items-start gap-4">
                      {/* Profile Photo */}
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                        <img
                          src={review.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.authorName)}&background=6366f1&color=fff&size=48`}
                          alt={review.authorName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.authorName)}&background=6366f1&color=fff&size=48`;
                          }}
                        />
                      </div>

                      {/* Review Content */}
                      <div className="flex-1 min-w-0">
                        {/* Author Name and Rating */}
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">{review.authorName}</h3>
                          <div className="flex-shrink-0">
                            {renderStars(review.rating)}
                          </div>
                        </div>

                        {/* Review Text */}
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                          {review.text}
                        </p>

                        {/* Time + Source */}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">{review.time}</p>
                          {renderSourceBadge(review.source)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
          </div>
        </div>

        {/* Add a Review buttons — one per enabled platform */}
        {content.showWriteReviewButton !== false && (() => {
          const platforms = content.platforms || { google: true };
          const buttons: { label: string; url: string | null; icon: React.ReactNode; bg: string }[] = [];

          if (platforms.google !== false && googlePlaceId) {
            buttons.push({
              label: 'Google',
              url: `https://search.google.com/local/writereview?placeid=${googlePlaceId}`,
              bg: '#4285F4',
              icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              ),
            });
          }
          if (platforms.tripadvisor && socialLinks?.tripadvisor) {
            buttons.push({
              label: 'TripAdvisor',
              url: socialLinks.tripadvisor,
              bg: '#00AF87',
              icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.5c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              ),
            });
          }
          if (platforms.facebook && socialLinks?.facebook) {
            buttons.push({
              label: 'Facebook',
              url: `${socialLinks.facebook.replace(/\/$/, '')}/reviews`,
              bg: '#1877F2',
              icon: (
                <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              ),
            });
          }
          if (platforms.instagram && socialLinks?.instagram) {
            buttons.push({
              label: 'Instagram',
              url: socialLinks.instagram,
              bg: '#E1306C',
              icon: (
                <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
              ),
            });
          }

          if (!buttons.length) return null;
          return (
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {buttons.map((btn) => btn.url && (
                <a
                  key={btn.label}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold transition-all hover:opacity-90 hover:shadow-md"
                  style={{ backgroundColor: btn.bg }}
                >
                  {btn.icon}
                  Add Review on {btn.label}
                </a>
              ))}
            </div>
          );
        })()}
      </div>
    </section>
  );
}

function ReviewButtonsSection({ content, primaryColor, googlePlaceId: placeIdProp }: { content: ReviewButtonsContent; primaryColor?: string; googlePlaceId?: string }) {
  const defaultBg = '#f5f5f4'; // sage-50 equivalent
  const bgColor = content.backgroundColor || defaultBg;
  const columns = content.columns || 3;
  const buttonStyle = content.buttonStyle || 'default';
  const showIcons = content.showIcons !== false;
  const googlePlaceId = placeIdProp || '';

  const processButtonUrl = (url: string) => {
    if (googlePlaceId) return `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;
    return url;
  };

  // Sort buttons by order if specified
  const sortedButtons = [...content.buttons].sort((a, b) => (a.order || 0) - (b.order || 0));

  const getButtonClasses = () => {
    const baseClasses = 'flex items-center gap-3 px-6 py-3 font-semibold transition-all duration-200 hover:scale-105 active:scale-95';
    
    switch (buttonStyle) {
      case 'rounded':
        return `${baseClasses} rounded-full`;
      case 'outlined':
        return `${baseClasses} rounded-lg border-2 border-gray-300 bg-white hover:border-gray-400 text-gray-700`;
      default:
        return `${baseClasses} rounded-lg shadow-md hover:shadow-lg`;
    }
  };

  const renderButtonIcon = (button: any) => {
    if (!showIcons) return null;

    // Platform-specific icons
    const platformIcons: Record<string, string> = {
      facebook: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
      instagram: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/></svg>',
      tripadvisor: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2zm0 2.5c-4.136 0-7.5 3.364-7.5 7.5S7.864 19.5 12 19.5s7.5-3.364 7.5-7.5S16.136 4.5 12 4.5zm0 2c2.485 0 4.5 2.015 4.5 4.5S14.485 15.5 12 15.5 7.5 13.485 7.5 11 9.515 6.5 12 6.5zm0 2c-1.379 0-2.5 1.121-2.5 2.5s1.121 2.5 2.5 2.5 2.5-1.121 2.5-2.5S13.379 10.5 12 10.5z"/></svg>',
      google: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
      yelp: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 5-5v10zm2 0V7l5 5-5 5z"/></svg>',
      zomato: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
    };

    // Use custom image if provided
    if (button.imageUrl) {
      return <img src={button.imageUrl} alt={button.label} className="w-6 h-6 object-contain" />;
    }

    // Use platform icon if available
    if (button.platform && platformIcons[button.platform]) {
      return (
        <span 
          className="w-6 h-6 flex items-center justify-center" 
          dangerouslySetInnerHTML={{ __html: platformIcons[button.platform] }}
        />
      );
    }

    // Default icon
    return (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18.10 5.93l-2.54-2.54c-.39-.39-1.02-.39-1.41 0L5.93 11.6c-.39.39-.39 1.02 0 1.41l2.54 2.54c.39.39 1.02.39 1.41 0l8.22-8.22c.39-.39.39-1.02 0-1.41zM8.14 14.86l-2.54-2.54 8.22-8.22 2.54 2.54-8.22 8.22z" clipRule="evenodd" />
      </svg>
    );
  };

  const getButtonStyle = (button: any) => {
    if (buttonStyle === 'outlined') {
      return {};
    }
    
    // Use custom color or primary color
    const bgColor = button.color || primaryColor || '#059669';
    return { backgroundColor: bgColor, color: 'white' };
  };

  return (
    <section className="pt-16 pb-10 lg:pt-20 lg:pb-12 overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="font-caviar font-bold text-2xl lg:text-3xl tracking-wide mb-3" style={{ fontFamily: 'var(--heading-font, Georgia, serif)', color: '#374151' }}>
            {content.heading || 'Leave Us a Review'}
          </h2>
          {content.subheading && (
            <p className="text-gray-600 max-w-lg mx-auto">{content.subheading}</p>
          )}
        </div>

        {/* Buttons Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4 max-w-4xl mx-auto`}>
          {sortedButtons.map((button) => (
            <a
              key={button.id}
              href={processButtonUrl(button.url)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${getButtonClasses()} text-center justify-center ${buttonStyle === 'outlined' ? 'hover:bg-gray-50' : 'text-white'}`}
              style={getButtonStyle(button)}
              aria-label={`Leave a review on ${button.label}`}
            >
              {renderButtonIcon(button)}
              <span>{button.label}</span>
            </a>
          ))}
        </div>

        {sortedButtons.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No review buttons yet</h3>
            <p className="text-gray-500 mb-4">
              Add review platforms in the page builder to display review buttons here.
            </p>
            <p className="text-sm text-gray-400">
              Edit this section to add Facebook, Google, TripAdvisor, and other review platforms.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ImageOnlySection({ content, primaryColor }: { content: ImageOnlyContent; primaryColor?: string }) {
  const defaultBg = '#f5f5f4'; // sage-50 equivalent
  const bgColor = content.backgroundColor || defaultBg;
  const [imageDimensions, setImageDimensions] = React.useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Handle image load to get dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  // Determine image orientation and layout
  const getImageLayout = () => {
    if (!imageLoaded) return { isPortrait: false, isVertical: false };

    const aspectRatio = imageDimensions.width / imageDimensions.height;
    const isPortrait = aspectRatio < 1; // height > width
    const isVertical = aspectRatio < 0.8; // significantly taller than wide

    return { isPortrait, isVertical };
  };

  const { isPortrait, isVertical } = getImageLayout();
  const fit = content.fit || 'contain';
  const maxWidth = content.maxWidth || 1200;

  // Determine container classes based on orientation
  const getContainerClasses = () => {
    if (!imageLoaded) return 'max-w-4xl mx-auto';

    if (isPortrait) {
      // Portrait: full width, centered
      return 'w-full';
    } else if (isVertical) {
      // Vertical: with gaps on both sides
      return 'max-w-4xl mx-auto';
    } else {
      // Landscape: standard container with gaps
      return 'max-w-6xl mx-auto';
    }
  };

  // Determine image classes
  const getImageClasses = () => {
    const baseClasses = 'w-full transition-all duration-300';
    
    if (isPortrait) {
      // Portrait: full width
      return `${baseClasses} h-auto`;
    } else {
      // Landscape/vertical: constrained width
      return `${baseClasses} h-auto`;
    }
  };

  const ImageComponent = (
    <img
      src={content.imageUrl}
      alt={content.alt || ''}
      onLoad={handleImageLoad}
      className={getImageClasses()}
      style={{
        objectFit: fit,
        maxWidth: isPortrait ? 'none' : `${maxWidth}px`,
      }}
    />
  );

  return (
    <section className="py-12 lg:py-16 overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className={getContainerClasses()}>
          {content.linkUrl ? (
            <a
              href={content.linkUrl}
              target={content.openInNewTab ? '_blank' : '_self'}
              rel={content.openInNewTab ? 'noopener noreferrer' : undefined}
              className="block group"
            >
              {ImageComponent}
            </a>
          ) : (
            ImageComponent
          )}
        </div>
      </div>
    </section>
  );
}

export function SectionRenderer({ section, primaryColor, themeSettings }: Props) {
  // Apply section background mode for home page sections only
  const getSectionStyle = () => {
    if (!themeSettings?.sectionBgMode) return {}; // Don't apply to other pages
    
    const sectionBgMode: SectionBgMode = themeSettings.sectionBgMode;
    const colorGroup = getColorGroup(primaryColor || '#3B82F6');
    const colorGroupId = colorGroup.id as keyof typeof SECTION_BG_PALETTES;
    const palette = SECTION_BG_PALETTES[colorGroupId] || SECTION_BG_PALETTES.modern;
    
    const entries = palette[sectionBgMode];
    const sectionIndex = section.order || 0;
    const entry = entries[sectionIndex % entries.length];
    
    return {
      backgroundColor: entry.bg,
    };
  };

  const sectionStyle = getSectionStyle();
  
  let content;
  switch (section.type) {
    case 'hero':
      content = <HeroSection content={section.content as HeroContent} primaryColor={primaryColor} />;
      break;
    case 'text':
      content = <TextSection content={section.content as TextContent} />;
      break;
    case 'image_text':
      content = <ImageTextSection content={section.content as ImageTextContent} primaryColor={primaryColor} />;
      break;
    case 'features':
      content = <FeaturesSection content={section.content as FeaturesContent} primaryColor={primaryColor} />;
      break;
    case 'gallery':
      content = <GallerySection content={section.content as GalleryContent} />;
      break;
    case 'cta':
      content = <CtaSection content={section.content as CtaContent} primaryColor={primaryColor} />;
      break;
    case 'contact_info':
      content = <ContactInfoSection content={section.content as ContactInfoContent} />;
      break;
    case 'divider':
      content = <DividerSection />;
      break;
    case 'data_table':
      content = <DataTableSection content={section.content as DataTableContent} primaryColor={primaryColor} />;
      break;
    case 'awards':
      content = <AwardsSection content={section.content as AwardsContent} primaryColor={primaryColor} />;
      break;
    case 'social_media':
      content = <SocialMediaSection content={section.content as SocialMediaContent} primaryColor={primaryColor} />;
      break;
    case 'google_reviews':
      content = <GoogleReviewsSection content={section.content as GoogleReviewsContent} primaryColor={primaryColor} googlePlaceId={themeSettings?.googlePlaceId} socialLinks={themeSettings?.socialLinks} />;
      break;
    case 'review_buttons':
      content = <ReviewButtonsSection content={section.content as ReviewButtonsContent} primaryColor={primaryColor} googlePlaceId={themeSettings?.googlePlaceId} />;
      break;
    case 'image_only':
      content = <ImageOnlySection content={section.content as ImageOnlyContent} primaryColor={primaryColor} />;
      break;
    default:
      content = null;
  }

  // Wrap section with background style if needed
  if (Object.keys(sectionStyle).length > 0) {
    return <div style={sectionStyle}>{content}</div>;
  }

  return content;
}
