/**
 * Smart theme generator — 5 design groups.
 * Each group defines fonts, text colours (on white AND dark backgrounds),
 * button radius, letter-spacing and decoration rules.
 *
 * CSS variables injected in layout.tsx are applied across ALL tenant pages
 * via globals.css `.tenant-site` rules.
 */

export interface ColorGroup {
  id: 'prestige' | 'artisan' | 'modern' | 'botanical' | 'vibrant';
  label: string;
  tagline: string;

  headingFont: string;
  headingFontStack: string;
  bodyFont: string;
  bodyFontStack: string;

  /** Heading colour when rendered on a white/light section */
  headingOnWhite: string;
  /** Body/paragraph colour on white/light section */
  bodyOnWhite: string;
  /** Heading colour on a dark/primary-coloured section */
  headingOnDark: string;
  /** Body colour on a dark/primary-coloured section */
  bodyOnDark: string;

  buttonRadius: string;
  letterSpacing: string;
  uppercaseHeadings: boolean;

  /** Short hint shown in admin swatch panel */
  decorationHint: string;
}

export const COLOR_GROUPS: ColorGroup[] = [
  {
    id: 'prestige',
    label: 'Prestige & Clubroom',
    tagline: 'Fine dining, steakhouses, whiskey bars, upscale sushi',
    headingFont: 'Playfair Display',
    headingFontStack: "var(--font-playfair), Georgia, serif",
    bodyFont: 'Lato',
    bodyFontStack: "var(--font-lato), system-ui, sans-serif",
    headingOnWhite: '#B8860B',   // dark gold — readable on white, still luxe
    bodyOnWhite:    '#3D2B1F',   // dark warm espresso
    headingOnDark:  '#D4AF37',   // full metallic gold
    bodyOnDark:     '#F5F5DC',   // cream
    buttonRadius: '0px',
    letterSpacing: '0.08em',
    uppercaseHeadings: false,
    decorationHint: 'Gold headings · Cream body · Square buttons + gold border · Thin gold dividers',
  },
  {
    id: 'artisan',
    label: 'Artisan & Heritage',
    tagline: 'Italian bistros, sourdough bakeries, wine bars, neighbourhood cafés',
    headingFont: 'Libre Baskerville',
    headingFontStack: "var(--font-libre-baskerville), Georgia, serif",
    bodyFont: 'Lato',
    bodyFontStack: "var(--font-lato), system-ui, sans-serif",
    headingOnWhite: '#362119',   // deep cacao brown
    bodyOnWhite:    '#5D4037',   // warm brown
    headingOnDark:  '#FFFDD0',   // soft cream
    bodyOnDark:     '#D7CCC8',   // warm light
    buttonRadius: '12px',
    letterSpacing: '0.02em',
    uppercaseHeadings: false,
    decorationHint: 'Warm serif · Rounded buttons · Italic h3/h4 · Parchment warmth',
  },
  {
    id: 'modern',
    label: 'Modern & Industrial',
    tagline: 'Urban bistros, pizza shops, craft breweries, tech cafés',
    headingFont: 'Montserrat',
    headingFontStack: "var(--font-montserrat), system-ui, sans-serif",
    bodyFont: 'Roboto',
    bodyFontStack: "var(--font-roboto), system-ui, sans-serif",
    headingOnWhite: 'var(--primary-hex)',  // primary colour as heading accent on white
    bodyOnWhite:    '#374151',             // graphite
    headingOnDark:  '#FFFFFF',
    bodyOnDark:     '#E5E7EB',
    buttonRadius: '0px',
    letterSpacing: '0.06em',
    uppercaseHeadings: true,
    decorationHint: 'Uppercase bold · Sharp square buttons · Block shadows · Concrete texture',
  },
  {
    id: 'botanical',
    label: 'Botanical & Fresh',
    tagline: 'Vegan spots, juice bars, garden cafés, seafood restaurants',
    headingFont: 'Cormorant Garamond',
    headingFontStack: "var(--font-cormorant-garamond), Georgia, serif",
    bodyFont: 'DM Sans',
    bodyFontStack: "var(--font-dm-sans), system-ui, sans-serif",
    headingOnWhite: '#064E3B',   // dark moss green
    bodyOnWhite:    '#475569',   // slate
    headingOnDark:  '#D1FAE5',   // soft mint
    bodyOnDark:     '#BAE6FD',   // pale sky
    buttonRadius: '50px',
    letterSpacing: '0.03em',
    uppercaseHeadings: false,
    decorationHint: 'Airy white space · Pill buttons · Circle image frames · Light oak',
  },
  {
    id: 'vibrant',
    label: 'Vibrant & Sweet',
    tagline: 'Dessert shops, ice cream, high-energy cafés, breakfast spots',
    headingFont: 'Nunito',
    headingFontStack: "var(--font-nunito), system-ui, sans-serif",
    bodyFont: 'Nunito',
    bodyFontStack: "var(--font-nunito), system-ui, sans-serif",
    headingOnWhite: '#09090B',   // near black — pops against vibrant bg
    bodyOnWhite:    '#1F2937',   // dark slate
    headingOnDark:  '#FFFFFF',
    bodyOnDark:     '#F9FAFB',
    buttonRadius: '50px',
    letterSpacing: '0.03em',
    uppercaseHeadings: false,
    decorationHint: 'Bubble buttons · Colourful shadows · Playful rounded type · Grain texture',
  },
];

const PRIMARY_TO_GROUP: Record<string, ColorGroup['id']> = {
  // Prestige & Clubroom
  '#2D1E17': 'prestige', '#1A1A1A': 'prestige', '#0F172A': 'prestige',
  '#480003': 'prestige', '#064E3B': 'prestige',  '#A0843E': 'prestige',
  '#450A0A': 'prestige',
  // Artisan & Heritage
  '#F5F5DC': 'artisan',  '#884C42': 'artisan',   '#7A5C61': 'artisan',
  '#B2AC88': 'artisan',  '#BE8A60': 'artisan',   '#EA580C': 'artisan',
  '#8D7B68': 'artisan',
  // Modern & Industrial
  '#475569': 'modern',   '#0D9488': 'modern',    '#1E293B': 'modern',
  '#1D1D1D': 'modern',   '#E2E8F0': 'modern',    '#1D4ED8': 'modern',
  '#262626': 'modern',
  // Botanical & Fresh
  '#14532D': 'botanical','#B7B53E': 'botanical', '#BAE6FD': 'botanical',
  '#D1FAE5': 'botanical','#F3F4F6': 'botanical', '#FFFFFF': 'botanical',
  '#374131': 'botanical',
  // Vibrant & Sweet
  '#FEF08A': 'vibrant',  '#F97316': 'vibrant',   '#EC4899': 'vibrant',
  '#E25822': 'vibrant',  '#DDD6FE': 'vibrant',   '#F472B6': 'vibrant',
  '#7E22CE': 'vibrant',
};

export function getColorGroup(primaryColor: string): ColorGroup {
  const id = PRIMARY_TO_GROUP[primaryColor] ?? PRIMARY_TO_GROUP[primaryColor.toUpperCase()];
  return COLOR_GROUPS.find((g) => g.id === id) ?? COLOR_GROUPS[2]; // default: modern
}

export function getBrightness(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return 128;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function isLightColor(hex: string): boolean {
  return getBrightness(hex) > 153;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface SmartTheme {
  isLight: boolean;
  group: ColorGroup;
  mainText: string;
  secondaryText: string;
  tileShadow: string;
  buttonBg: string;
  buttonText: string;
  hoverBg: string;
  activeBg: string;
  borderColor: string;
}

export function generateTheme(primaryColor: string): SmartTheme {
  const light = isLightColor(primaryColor);
  const group = getColorGroup(primaryColor);
  return {
    isLight: light,
    group,
    mainText:      light ? '#1A1A1A' : '#FFFFFF',
    secondaryText: light ? 'rgba(0,0,0,0.58)' : 'rgba(255,255,255,0.72)',
    tileShadow:    hexToRgba(primaryColor, 0.18),
    buttonBg:      light ? '#111111' : '#FFFFFF',
    buttonText:    light ? '#FFFFFF' : '#111111',
    hoverBg:       light ? 'rgba(0,0,0,0.08)'  : 'rgba(255,255,255,0.12)',
    activeBg:      light ? 'rgba(0,0,0,0.14)'  : 'rgba(255,255,255,0.22)',
    borderColor:   light ? 'rgba(0,0,0,0.20)'  : 'rgba(255,255,255,0.30)',
  };
}
