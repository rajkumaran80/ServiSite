'use client';

import { useState } from 'react';
import { PageTemplate } from '../../config/page-templates';

export interface TemplateColorScheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  surfaceColor: string;
}

interface Props {
  templates: PageTemplate[];
  initialIndex: number;
  currentTemplateId: string;
  /** Saved colour scheme for the currently-applied template — restored when user navigates to it */
  storedColors?: TemplateColorScheme;
  isSaving: boolean;
  onApply: (templateId: string, colors: TemplateColorScheme) => void;
  onClose: () => void;
}

const DEMO_ITEMS = [
  { name: 'Flat White', desc: 'Smooth espresso with velvety steamed milk', price: '£3.80', emoji: '☕' },
  { name: 'Avocado Toast', desc: 'Sourdough, smashed avo, chilli flakes', price: '£8.50', emoji: '🥑' },
  { name: 'Stack of Pancakes', desc: 'Buttermilk stack with maple syrup & berries', price: '£9.00', emoji: '🥞' },
];

const GALLERY_EMOJIS = ['🥐', '☕', '🥗', '🧁'];

function isDarkStyle(heroStyle: string) {
  return ['dark', 'neon', 'cinematic', 'magazine', 'power', 'bold', 'centered'].includes(heroStyle);
}

function isLightStyle(heroStyle: string) {
  return ['typographic', 'vintage', 'geometric', 'luxe', 'cozy', 'minimal', 'light'].includes(heroStyle);
}

function defaultColors(tmpl: PageTemplate): TemplateColorScheme {
  return {
    primaryColor: tmpl.primaryColor,
    secondaryColor: tmpl.secondaryColor,
    accentColor: tmpl.primaryColor,
    surfaceColor: isLightStyle(tmpl.heroStyle) ? '#faf7f4' : '#f4f4f5',
  };
}

export default function TemplatePreviewModal({
  templates,
  initialIndex,
  currentTemplateId,
  storedColors,
  isSaving,
  onApply,
  onClose,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const template = templates[index];

  // On first open: if we're on the applied template, restore its saved colours
  const [colors, setColors] = useState<TemplateColorScheme>(() =>
    template.id === currentTemplateId && storedColors ? storedColors : defaultColors(template),
  );

  const updateColor = (key: keyof TemplateColorScheme, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const goTo = (newIndex: number) => {
    const tmpl = templates[newIndex];
    setIndex(newIndex);
    // When navigating back to the currently-applied template, restore its saved colours
    if (tmpl.id === currentTemplateId && storedColors) {
      setColors(storedColors);
    } else {
      setColors(defaultColors(tmpl));
    }
  };

  const dark = isDarkStyle(template.heroStyle);
  const light = isLightStyle(template.heroStyle);

  const heroBg: React.CSSProperties['background'] = dark
    ? `linear-gradient(135deg, #0d0d0d 0%, ${colors.secondaryColor}cc 100%)`
    : light
    ? `linear-gradient(135deg, ${colors.surfaceColor} 0%, #ffffff 100%)`
    : `linear-gradient(135deg, ${colors.primaryColor} 0%, ${colors.secondaryColor} 100%)`;

  const heroText = dark || (!light) ? '#ffffff' : '#1a1a1a';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white shrink-0 border-b border-gray-800">
        {/* Prev / title / Next */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo((index - 1 + templates.length) % templates.length)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            ← Prev
          </button>
          <div className="text-center min-w-[140px]">
            <p className="font-semibold text-sm">{template.name}</p>
            <p className="text-xs text-gray-400">{index + 1} of {templates.length}</p>
          </div>
          <button
            onClick={() => goTo((index + 1) % templates.length)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Tagline */}
        <p className="text-xs text-gray-400 italic hidden md:block">{template.tagline}</p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onApply(template.id, colors)}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg text-sm font-semibold transition-colors"
          >
            {isSaving && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Apply Template
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: colour controls */}
        <div className="w-68 shrink-0 bg-gray-50 border-r border-gray-200 p-5 overflow-y-auto" style={{ width: 272 }}>
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Colour Scheme</h3>

          {(
            [
              { key: 'primaryColor', label: 'Primary', desc: 'Buttons & key accents' },
              { key: 'secondaryColor', label: 'Secondary', desc: 'Supporting shade' },
              { key: 'accentColor', label: 'Accent', desc: 'Highlights & borders' },
              { key: 'surfaceColor', label: 'Surface', desc: 'Backgrounds & cards' },
            ] as { key: keyof TemplateColorScheme; label: string; desc: string }[]
          ).map(({ key, label, desc }) => (
            <div key={key} className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">{label}</label>
              <p className="text-xs text-gray-400 mb-2">{desc}</p>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) => updateColor(key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={colors[key]}
                  onChange={(e) => {
                    if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) updateColor(key, e.target.value);
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => goTo(index)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg py-2 mt-1 transition-colors"
          >
            Reset to defaults
          </button>

          {currentTemplateId === template.id && (
            <div className="mt-4 px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-600 text-center font-medium">
              ✓ Currently applied
            </div>
          )}
        </div>

        {/* Right panel: live page preview */}
        <div className="flex-1 overflow-y-auto bg-white">
          <DemoCafePage
            template={template}
            colors={colors}
            heroBg={heroBg}
            heroText={heroText}
            isLightNav={light}
          />
        </div>
      </div>
    </div>
  );
}

function DemoCafePage({
  template,
  colors,
  heroBg,
  heroText,
  isLightNav,
}: {
  template: PageTemplate;
  colors: TemplateColorScheme;
  heroBg: React.CSSProperties['background'];
  heroText: string;
  isLightNav: boolean;
}) {
  const serif = template.fontFamily === 'Playfair Display';
  const fontFamily = serif ? 'Georgia, "Times New Roman", serif' : '"Inter", system-ui, sans-serif';
  const isNeon = template.heroStyle === 'neon';
  const isTypographic = template.heroStyle === 'typographic' || template.heroStyle === 'geometric';
  const isCentered = ['centered', 'sunset', 'cozy', 'cinematic'].includes(template.heroStyle);

  return (
    <div style={{ fontFamily, minWidth: 800 }}>
      {/* ── Navbar ── */}
      <nav
        style={{
          background: colors.primaryColor,
          color: '#ffffff',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          padding: '0 40px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            M
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#ffffff' }}>The Maple Bean</span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {['Menu', 'Gallery', 'About', 'Contact'].map((item) => (
            <span key={item} style={{ cursor: 'default' }}>{item}</span>
          ))}
        </div>
        <button
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'default',
          }}
        >
          Book a Table
        </button>
      </nav>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 420 }}>
        {/* Restaurant photo background — only for dark/colourful hero styles */}
        {!isLightNav && !isTypographic && (
          <img
            src="/demo-restaurant.svg"
            alt=""
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        {/* Colour overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isLightNav || isTypographic
              ? heroBg
              : isNeon
              ? `linear-gradient(135deg, rgba(0,0,0,0.82) 0%, ${colors.secondaryColor}99 100%)`
              : `linear-gradient(135deg, ${colors.primaryColor}cc 0%, ${colors.secondaryColor}aa 100%)`,
          }}
        />
        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: isCentered ? '88px 40px' : '80px 40px',
            textAlign: isCentered ? 'center' : 'left',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: isCentered ? 'center' : 'flex-start',
          }}
        >
        {isNeon ? (
          <>
            <p
              style={{
                fontSize: 11,
                letterSpacing: 5,
                textTransform: 'uppercase',
                color: colors.primaryColor,
                marginBottom: 14,
                textShadow: `0 0 10px ${colors.primaryColor}`,
              }}
            >
              Open late · Est. 2010
            </p>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.08,
                color: '#ffffff',
                marginBottom: 18,
                textShadow: `0 0 24px ${colors.primaryColor}80`,
              }}
            >
              Where Every Cup<br />Tells a Story
            </h1>
            <p style={{ fontSize: 16, color: '#ffffff88', marginBottom: 32 }}>
              Freshly roasted coffee and artisan food, served all night.
            </p>
            <button
              style={{
                background: colors.primaryColor,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'default',
                boxShadow: `0 0 24px ${colors.primaryColor}50`,
              }}
            >
              View Menu
            </button>
          </>
        ) : isTypographic ? (
          <>
            <p
              style={{
                fontSize: 11,
                letterSpacing: 5,
                textTransform: 'uppercase',
                color: colors.primaryColor,
                marginBottom: 16,
              }}
            >
              Artisan Coffee &amp; Food
            </p>
            <h1
              style={{
                fontSize: 58,
                fontWeight: 900,
                lineHeight: 1.04,
                color: heroText,
                marginBottom: 22,
                maxWidth: 580,
              }}
            >
              Where Every Cup Tells a Story
            </h1>
            <p style={{ fontSize: 18, color: heroText + 'bb', marginBottom: 34, maxWidth: 500 }}>
              Freshly roasted coffee, artisan food, and a warm welcome in the heart of the city.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                style={{
                  background: colors.primaryColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'default',
                }}
              >
                View Menu
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: colors.primaryColor,
                  border: `2px solid ${colors.primaryColor}`,
                  borderRadius: 8,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'default',
                }}
              >
                Our Story
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: heroText + 'aa',
                marginBottom: 14,
              }}
            >
              Artisan Coffee &amp; Food
            </p>
            <h1
              style={{
                fontSize: 50,
                fontWeight: 800,
                lineHeight: 1.1,
                color: heroText,
                marginBottom: 18,
                maxWidth: isCentered ? 520 : 560,
              }}
            >
              Where Every Cup Tells a Story
            </h1>
            <p
              style={{
                fontSize: 17,
                color: heroText + 'cc',
                marginBottom: 32,
                maxWidth: 480,
              }}
            >
              Freshly roasted coffee, artisan food, and a warm welcome.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                style={{
                  background: colors.primaryColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'default',
                }}
              >
                View Menu
              </button>
              <button
                style={{
                  background: 'transparent',
                  color: heroText,
                  border: `2px solid ${heroText}55`,
                  borderRadius: 8,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'default',
                }}
              >
                Our Story
              </button>
            </div>
          </>
        )}
        </div>{/* end content */}
      </div>{/* end hero */}

      {/* ── Menu Highlights ── */}
      <div style={{ padding: '64px 40px', background: colors.surfaceColor }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: colors.primaryColor,
              marginBottom: 8,
            }}
          >
            Our Favourites
          </p>
          <h2 style={{ fontSize: 34, fontWeight: 700, color: '#1a1a1a' }}>Menu Highlights</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {DEMO_ITEMS.map((item) => (
            <div
              key={item.name}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  height: 180,
                  background: `linear-gradient(135deg, ${colors.accentColor}30, ${colors.primaryColor}20)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                }}
              >
                {item.emoji}
              </div>
              <div style={{ padding: '20px 22px' }}>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a', marginBottom: 6 }}>
                  {item.name}
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
                  {item.desc}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 18, color: colors.primaryColor }}>{item.price}</span>
                  <button
                    style={{
                      background: colors.primaryColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '7px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'default',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── About ── */}
      <div
        style={{
          padding: '64px 40px',
          display: 'flex',
          gap: 48,
          alignItems: 'center',
          background: '#ffffff',
        }}
      >
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: colors.primaryColor,
              marginBottom: 12,
            }}
          >
            Our Story
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1a1a1a', marginBottom: 18, lineHeight: 1.2 }}>
            Family-owned since 2010
          </h2>
          <p style={{ fontSize: 16, color: '#4b5563', lineHeight: 1.75, marginBottom: 28 }}>
            We started The Maple Bean with one simple belief: a great cup of coffee can brighten
            anyone&apos;s day. From our carefully sourced single-origin beans to our freshly baked
            pastries, every item is made with love and care.
          </p>
          <button
            style={{
              border: `2px solid ${colors.primaryColor}`,
              color: colors.primaryColor,
              background: 'transparent',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'default',
            }}
          >
            Learn More →
          </button>
        </div>
        <div
          style={{
            flex: 1,
            borderRadius: 20,
            height: 300,
            background: `linear-gradient(135deg, ${colors.primaryColor}25, ${colors.secondaryColor}40)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 72,
          }}
        >
          🫘
        </div>
      </div>

      {/* ── Gallery Strip ── */}
      <div style={{ padding: '0 40px 64px', background: colors.surfaceColor }}>
        <div style={{ textAlign: 'center', paddingTop: 64, marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.primaryColor, marginBottom: 8 }}>
            Gallery
          </p>
          <h2 style={{ fontSize: 30, fontWeight: 700, color: '#1a1a1a' }}>A Taste of What Awaits</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {GALLERY_EMOJIS.map((emoji, i) => (
            <div
              key={i}
              style={{
                height: 180,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${colors.accentColor}35, ${colors.secondaryColor}30)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ background: '#111111', color: '#ffffff', padding: '52px 40px 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 40,
            marginBottom: 36,
          }}
        >
          <div>
            <p style={{ fontWeight: 700, fontSize: 18, color: colors.primaryColor, marginBottom: 10 }}>
              The Maple Bean
            </p>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.65 }}>
              Artisan coffee and food in the heart of the city. Open 7 days a week.
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Quick Links</p>
            {['Menu', 'Gallery', 'About Us', 'Contact'].map((link) => (
              <p key={link} style={{ fontSize: 13, color: '#9ca3af', marginBottom: 7, cursor: 'default' }}>
                {link}
              </p>
            ))}
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Visit Us</p>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.65 }}>
              123 High Street<br />London, EC1A 1BB<br />Mon–Sun: 8am – 9pm
            </p>
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid #2a2a2a',
            paddingTop: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            © 2024 The Maple Bean. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Instagram', 'Facebook', 'Twitter'].map((s) => (
              <span key={s} style={{ fontSize: 12, color: colors.primaryColor, cursor: 'default' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
