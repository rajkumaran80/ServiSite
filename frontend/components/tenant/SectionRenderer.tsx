import React from 'react';
import type {
  PageSection,
  HeroContent,
  TextContent,
  ImageTextContent,
  FeaturesContent,
  GalleryContent,
  CtaContent,
  ContactInfoContent,
} from '../../types/page.types';

interface Props {
  section: PageSection;
  primaryColor?: string;
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

export function SectionRenderer({ section, primaryColor }: Props) {
  switch (section.type) {
    case 'hero':
      return <HeroSection content={section.content as HeroContent} primaryColor={primaryColor} />;
    case 'text':
      return <TextSection content={section.content as TextContent} />;
    case 'image_text':
      return <ImageTextSection content={section.content as ImageTextContent} primaryColor={primaryColor} />;
    case 'features':
      return <FeaturesSection content={section.content as FeaturesContent} primaryColor={primaryColor} />;
    case 'gallery':
      return <GallerySection content={section.content as GalleryContent} />;
    case 'cta':
      return <CtaSection content={section.content as CtaContent} primaryColor={primaryColor} />;
    case 'contact_info':
      return <ContactInfoSection content={section.content as ContactInfoContent} />;
    case 'divider':
      return <DividerSection />;
    default:
      return null;
  }
}
