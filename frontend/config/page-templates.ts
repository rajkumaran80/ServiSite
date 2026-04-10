export interface PageTemplate {
  id: string;
  name: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  heroStyle: 'dark' | 'centered' | 'minimal' | 'light' | 'neon' | 'typographic' | 'sunset' | 'vintage' | 'luxe' | 'power' | 'cozy' | 'magazine' | 'split' | 'cinematic' | 'geometric' | 'bold';
  cardStyle: 'grid' | 'large';
  /** Tailwind gradient for picker preview card */
  previewGradient: string;
  previewTextColor: string;
  /** When false, hide the letter-avatar in the navbar (text-only branding) */
  showLogo?: boolean;
  /** Show menu groups as full-bleed image category cards (Ravensbury-style) */
  showCategoryGrid?: boolean;
}

// ── RESTAURANT ────────────────────────────────────────────────────────────────
const RESTAURANT_TEMPLATES: PageTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Bold dark hero · Red accents · Card grid',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    fontFamily: 'Inter',
    heroStyle: 'dark',
    cardStyle: 'grid',
    previewGradient: 'from-red-800 via-gray-900 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    tagline: 'Serif font · Warm gold · Refined layout',
    primaryColor: '#B45309',
    secondaryColor: '#92400E',
    fontFamily: 'Playfair Display',
    heroStyle: 'centered',
    cardStyle: 'large',
    previewGradient: 'from-amber-800 via-amber-900 to-stone-900',
    previewTextColor: 'text-white',
  },
  {
    id: 'modern',
    name: 'Modern',
    tagline: 'Minimal · Monochrome · Sharp lines',
    primaryColor: '#18181B',
    secondaryColor: '#3F3F46',
    fontFamily: 'Inter',
    heroStyle: 'minimal',
    cardStyle: 'grid',
    previewGradient: 'from-zinc-700 via-zinc-800 to-zinc-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'fresh',
    name: 'Fresh & Natural',
    tagline: 'Light · Airy · Green tones',
    primaryColor: '#16A34A',
    secondaryColor: '#15803D',
    fontFamily: 'Inter',
    heroStyle: 'light',
    cardStyle: 'grid',
    previewGradient: 'from-emerald-500 via-green-600 to-emerald-800',
    previewTextColor: 'text-white',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    tagline: 'Dark · Vivid neon · Night-life energy',
    primaryColor: '#A855F7',
    secondaryColor: '#7C3AED',
    fontFamily: 'Inter',
    heroStyle: 'neon',
    cardStyle: 'grid',
    previewGradient: 'from-purple-950 via-gray-950 to-black',
    previewTextColor: 'text-purple-300',
    showLogo: false,
  },
  {
    id: 'typographic',
    name: 'Typographic',
    tagline: 'White · Giant display type · Text-first',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    fontFamily: 'Inter',
    heroStyle: 'typographic',
    cardStyle: 'large',
    previewGradient: 'from-white via-gray-50 to-gray-100',
    previewTextColor: 'text-gray-900',
    showLogo: false,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    tagline: 'Warm gradient · Vibrant · No image needed',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    fontFamily: 'Inter',
    heroStyle: 'sunset',
    cardStyle: 'grid',
    previewGradient: 'from-orange-400 via-rose-500 to-pink-700',
    previewTextColor: 'text-white',
    showLogo: false,
  },
  {
    id: 'magazine',
    name: 'Magazine',
    tagline: 'Full-bleed photo · Editorial text at bottom',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    fontFamily: 'Playfair Display',
    heroStyle: 'magazine',
    cardStyle: 'large',
    previewGradient: 'from-gray-900 via-gray-800 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'split',
    name: 'Split Screen',
    tagline: 'Colour panel left · Full image right',
    primaryColor: '#0F766E',
    secondaryColor: '#0D9488',
    fontFamily: 'Inter',
    heroStyle: 'split',
    cardStyle: 'grid',
    previewGradient: 'from-teal-700 via-teal-600 to-teal-500',
    previewTextColor: 'text-white',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'Letterbox bars · Panoramic · Film aesthetic',
    primaryColor: '#E11D48',
    secondaryColor: '#BE123C',
    fontFamily: 'Inter',
    heroStyle: 'cinematic',
    cardStyle: 'large',
    previewGradient: 'from-black via-gray-900 to-black',
    previewTextColor: 'text-white',
    showLogo: false,
  },
  {
    id: 'geometric',
    name: 'Geometric',
    tagline: 'Outlined type · Overlapping shapes · Design-forward',
    primaryColor: '#4F46E5',
    secondaryColor: '#4338CA',
    fontFamily: 'Inter',
    heroStyle: 'geometric',
    cardStyle: 'grid',
    previewGradient: 'from-white via-indigo-50 to-white',
    previewTextColor: 'text-gray-900',
    showLogo: false,
  },
  {
    id: 'bold',
    name: 'Bold Colour',
    tagline: 'Giant colour slab · White text · Framed image',
    primaryColor: '#7C3AED',
    secondaryColor: '#6D28D9',
    fontFamily: 'Inter',
    heroStyle: 'bold',
    cardStyle: 'grid',
    previewGradient: 'from-violet-600 via-violet-700 to-violet-900',
    previewTextColor: 'text-white',
  },
  {
    id: 'grand',
    name: 'Grand',
    tagline: 'Dark & Gold · Upscale dining · Category showcase',
    primaryColor: '#C4A35A',
    secondaryColor: '#A0843E',
    fontFamily: 'Playfair Display',
    heroStyle: 'dark',
    cardStyle: 'large',
    showCategoryGrid: true,
    previewGradient: 'from-stone-950 via-gray-900 to-black',
    previewTextColor: 'text-amber-300',
  },
];

// ── CAFE ──────────────────────────────────────────────────────────────────────
const CAFE_TEMPLATES: PageTemplate[] = [
  {
    id: 'cafe-cozy',
    name: 'Cozy Corner',
    tagline: 'Warm · Soft tones · Inviting atmosphere',
    primaryColor: '#92400E',
    secondaryColor: '#78350F',
    fontFamily: 'Playfair Display',
    heroStyle: 'cozy',
    cardStyle: 'grid',
    previewGradient: 'from-amber-100 via-orange-50 to-stone-100',
    previewTextColor: 'text-amber-900',
  },
  {
    id: 'cafe-espresso',
    name: 'Espresso',
    tagline: 'Deep dark roast · Bold typography · No-fuss',
    primaryColor: '#C2410C',
    secondaryColor: '#9A3412',
    fontFamily: 'Inter',
    heroStyle: 'dark',
    cardStyle: 'grid',
    previewGradient: 'from-stone-900 via-amber-950 to-stone-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'cafe-bloom',
    name: 'Morning Bloom',
    tagline: 'Soft pink · Light & airy · Feminine',
    primaryColor: '#DB2777',
    secondaryColor: '#BE185D',
    fontFamily: 'Inter',
    heroStyle: 'light',
    cardStyle: 'grid',
    previewGradient: 'from-pink-100 via-rose-50 to-fuchsia-100',
    previewTextColor: 'text-pink-900',
  },
  {
    id: 'cafe-sunset',
    name: 'Golden Hour',
    tagline: 'Warm gradient · Sunset vibes · Casual',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    fontFamily: 'Inter',
    heroStyle: 'sunset',
    cardStyle: 'grid',
    previewGradient: 'from-yellow-400 via-orange-400 to-amber-600',
    previewTextColor: 'text-white',
    showLogo: false,
  },
];

// ── BARBER SHOP ───────────────────────────────────────────────────────────────
const BARBER_TEMPLATES: PageTemplate[] = [
  {
    id: 'barber-vintage',
    name: 'Vintage Cuts',
    tagline: 'Classic red & white · Retro barber pole',
    primaryColor: '#DC2626',
    secondaryColor: '#B91C1C',
    fontFamily: 'Inter',
    heroStyle: 'vintage',
    cardStyle: 'grid',
    previewGradient: 'from-red-50 via-white to-red-50',
    previewTextColor: 'text-gray-900',
  },
  {
    id: 'barber-navy',
    name: 'Classic Shave',
    tagline: 'Navy & gold · Sharp · Traditional craft',
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E40AF',
    fontFamily: 'Inter',
    heroStyle: 'dark',
    cardStyle: 'grid',
    previewGradient: 'from-blue-900 via-slate-900 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'barber-urban',
    name: 'Urban Fade',
    tagline: 'Black & white · Street-style · Monochrome',
    primaryColor: '#09090B',
    secondaryColor: '#27272A',
    fontFamily: 'Inter',
    heroStyle: 'minimal',
    cardStyle: 'grid',
    previewGradient: 'from-zinc-900 via-zinc-800 to-zinc-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'barber-neon',
    name: 'Neon Fade',
    tagline: 'Dark · Electric blue glow · Night vibes',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0284C7',
    fontFamily: 'Inter',
    heroStyle: 'neon',
    cardStyle: 'grid',
    previewGradient: 'from-sky-950 via-gray-950 to-black',
    previewTextColor: 'text-sky-300',
    showLogo: false,
  },
];

// ── SALON ─────────────────────────────────────────────────────────────────────
const SALON_TEMPLATES: PageTemplate[] = [
  {
    id: 'salon-luxe',
    name: 'Luxe Beauty',
    tagline: 'Rose gold · Ultra refined · Premium feel',
    primaryColor: '#BE8A60',
    secondaryColor: '#A0714A',
    fontFamily: 'Playfair Display',
    heroStyle: 'luxe',
    cardStyle: 'large',
    previewGradient: 'from-rose-50 via-amber-50 to-stone-100',
    previewTextColor: 'text-stone-800',
  },
  {
    id: 'salon-glam',
    name: 'Glam Studio',
    tagline: 'Deep plum · Sophisticated · Centered hero',
    primaryColor: '#7C3AED',
    secondaryColor: '#6D28D9',
    fontFamily: 'Playfair Display',
    heroStyle: 'centered',
    cardStyle: 'large',
    previewGradient: 'from-violet-900 via-purple-900 to-fuchsia-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'salon-blush',
    name: 'Chic Blush',
    tagline: 'Blush pink · Airy & light · Modern feminine',
    primaryColor: '#E11D48',
    secondaryColor: '#BE123C',
    fontFamily: 'Inter',
    heroStyle: 'light',
    cardStyle: 'grid',
    previewGradient: 'from-rose-100 via-pink-50 to-fuchsia-50',
    previewTextColor: 'text-rose-900',
  },
  {
    id: 'salon-minimal',
    name: 'Clean Studio',
    tagline: 'White · Gold accent · Swiss minimal',
    primaryColor: '#CA8A04',
    secondaryColor: '#A16207',
    fontFamily: 'Inter',
    heroStyle: 'typographic',
    cardStyle: 'large',
    previewGradient: 'from-white via-yellow-50 to-stone-50',
    previewTextColor: 'text-gray-900',
    showLogo: false,
  },
];

// ── GYM ───────────────────────────────────────────────────────────────────────
const GYM_TEMPLATES: PageTemplate[] = [
  {
    id: 'gym-power',
    name: 'Power House',
    tagline: 'Black & red · Angled · Raw energy',
    primaryColor: '#DC2626',
    secondaryColor: '#B91C1C',
    fontFamily: 'Inter',
    heroStyle: 'power',
    cardStyle: 'grid',
    previewGradient: 'from-red-600 via-gray-950 to-black',
    previewTextColor: 'text-white',
  },
  {
    id: 'gym-steel',
    name: 'Iron Drive',
    tagline: 'Dark steel · Orange spark · Intense',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    fontFamily: 'Inter',
    heroStyle: 'dark',
    cardStyle: 'grid',
    previewGradient: 'from-orange-700 via-gray-900 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'gym-neon',
    name: 'Neon Flex',
    tagline: 'Black · Electric green · Night training',
    primaryColor: '#22C55E',
    secondaryColor: '#16A34A',
    fontFamily: 'Inter',
    heroStyle: 'neon',
    cardStyle: 'grid',
    previewGradient: 'from-green-950 via-gray-950 to-black',
    previewTextColor: 'text-green-400',
    showLogo: false,
  },
  {
    id: 'gym-minimal',
    name: 'Clean Gains',
    tagline: 'White · Bold type · No-fuss performance',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    fontFamily: 'Inter',
    heroStyle: 'minimal',
    cardStyle: 'grid',
    previewGradient: 'from-slate-600 via-slate-800 to-slate-950',
    previewTextColor: 'text-white',
  },
];

// ── REPAIR SHOP ───────────────────────────────────────────────────────────────
const REPAIR_TEMPLATES: PageTemplate[] = [
  {
    id: 'repair-pro',
    name: 'Pro Service',
    tagline: 'Navy blue · Trust · Professional grade',
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E40AF',
    fontFamily: 'Inter',
    heroStyle: 'dark',
    cardStyle: 'grid',
    previewGradient: 'from-blue-800 via-blue-950 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'repair-clean',
    name: 'Clean & Reliable',
    tagline: 'White · Blue lines · Clear & trustworthy',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    fontFamily: 'Inter',
    heroStyle: 'minimal',
    cardStyle: 'grid',
    previewGradient: 'from-blue-100 via-white to-sky-50',
    previewTextColor: 'text-gray-900',
  },
  {
    id: 'repair-bold',
    name: 'Bold & Fast',
    tagline: 'Orange · High contrast · Action-first',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    fontFamily: 'Inter',
    heroStyle: 'sunset',
    cardStyle: 'grid',
    previewGradient: 'from-orange-500 via-orange-600 to-red-700',
    previewTextColor: 'text-white',
    showLogo: false,
  },
];

// ── OTHER / GENERAL ───────────────────────────────────────────────────────────
const OTHER_TEMPLATES: PageTemplate[] = [
  {
    id: 'other-professional',
    name: 'Professional',
    tagline: 'Dark navy · Corporate · Trustworthy',
    primaryColor: '#1E3A8A',
    secondaryColor: '#1E40AF',
    fontFamily: 'Inter',
    heroStyle: 'dark',
    cardStyle: 'grid',
    previewGradient: 'from-blue-900 via-slate-900 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'other-minimal',
    name: 'Clean Business',
    tagline: 'White · Charcoal · Swiss precision',
    primaryColor: '#334155',
    secondaryColor: '#475569',
    fontFamily: 'Inter',
    heroStyle: 'minimal',
    cardStyle: 'grid',
    previewGradient: 'from-slate-500 via-slate-700 to-slate-900',
    previewTextColor: 'text-white',
  },
  {
    id: 'other-vibrant',
    name: 'Vibrant',
    tagline: 'Colourful gradient · Energy · Stand out',
    primaryColor: '#7C3AED',
    secondaryColor: '#6D28D9',
    fontFamily: 'Inter',
    heroStyle: 'sunset',
    cardStyle: 'grid',
    previewGradient: 'from-violet-500 via-purple-600 to-indigo-700',
    previewTextColor: 'text-white',
    showLogo: false,
  },
];

// ── TEMPLATES_BY_TYPE map ─────────────────────────────────────────────────────
export const TEMPLATES_BY_TYPE: Record<string, PageTemplate[]> = {
  RESTAURANT: RESTAURANT_TEMPLATES,
  CAFE: CAFE_TEMPLATES,
  BARBER_SHOP: BARBER_TEMPLATES,
  SALON: SALON_TEMPLATES,
  GYM: GYM_TEMPLATES,
  REPAIR_SHOP: REPAIR_TEMPLATES,
  OTHER: OTHER_TEMPLATES,
};

/** All templates across all types (for backward-compat lookups) */
const ALL_TEMPLATES: PageTemplate[] = Object.values(TEMPLATES_BY_TYPE).flat();

/** Return the templates relevant to a given tenant type */
export function getTemplatesForType(type?: string | null): PageTemplate[] {
  return TEMPLATES_BY_TYPE[type ?? ''] ?? RESTAURANT_TEMPLATES;
}

/** Look up a template by id across all types */
export function getPageTemplate(id?: string | null): PageTemplate {
  return ALL_TEMPLATES.find((t) => t.id === id) ?? RESTAURANT_TEMPLATES[0];
}

/** @deprecated Use TEMPLATES_BY_TYPE.RESTAURANT or getTemplatesForType('RESTAURANT') */
export const RESTAURANT_PAGE_TEMPLATES = RESTAURANT_TEMPLATES;
