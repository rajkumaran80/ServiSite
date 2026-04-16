export type BusinessType = 'RESTAURANT' | 'CAFE' | 'BARBER_SHOP' | 'SALON' | 'GYM' | 'REPAIR_SHOP' | 'OTHER';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Per-tenant overrides injected as CSS variables. Applied on top of template defaults.
export interface DesignTokens {
  /** Card / button corner radius */
  radius: string;
  /** Glassmorphism card effect */
  glassEffect: boolean;
}

export const FALLBACK_TOKENS: DesignTokens = {
  radius: '16px',
  glassEffect: false,
};

/** Per-template sensible defaults — overridden by any saved designTokens */
const TEMPLATE_TOKENS: Record<string, DesignTokens> = {
  grande:       { radius: '0px',  glassEffect: false },
  boutique:     { radius: '20px', glassEffect: false },
  professional: { radius: '8px',  glassEffect: false },
  urban:        { radius: '4px',  glassEffect: true  },
  minimalist:   { radius: '0px',  glassEffect: false },
  cinematic:    { radius: '0px',  glassEffect: false },
  classic:      { radius: '8px',  glassEffect: false },
  cozy:         { radius: '20px', glassEffect: false },
};

export function getTemplateTokenDefaults(templateId?: string | null): DesignTokens {
  return TEMPLATE_TOKENS[templateId ?? ''] ?? FALLBACK_TOKENS;
}

export function resolveDesignTokens(
  templateId?: string | null,
  saved?: Partial<DesignTokens> | null,
): DesignTokens {
  const defaults = getTemplateTokenDefaults(templateId);
  return {
    radius:      saved?.radius      ?? defaults.radius,
    glassEffect: saved?.glassEffect ?? defaults.glassEffect,
  };
}

// ── TEMPLATE LAYER ────────────────────────────────────────────────────────────
// 5 master structural templates. Defines layout bones — hero type, hanging
// effect, card arrangement, typography DNA. Colours are defaults only;
// business presets and manual overrides take priority.
export interface PageTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  // Structural
  heroStyle: 'dark' | 'centered' | 'minimal' | 'light' | 'neon' | 'typographic' | 'sunset' | 'vintage' | 'luxe' | 'power' | 'cozy' | 'magazine' | 'split' | 'cinematic' | 'geometric' | 'bold';
  cardStyle: 'grid' | 'large';
  hangingHero: boolean;
  showLogo?: boolean;
  showCategoryGrid?: boolean;
  // Typography DNA
  fontFamily: string; // kept for legacy code paths (= headingFont)
  headingFont: string;
  bodyFont: string;
  // Default colours — overridden by business preset then manual override
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  // Preview card
  previewGradient: string;
  previewTextColor: string;
}

// ── PRESET LAYER ──────────────────────────────────────────────────────────────
// Per-business-type skin: default colours, terminology, CTAs.
// Applied on top of whichever master template is chosen.
export interface BusinessPreset {
  type: BusinessType;
  label: string;
  /** 3 template IDs shown first — "Recommended for [Type]" */
  recommendedTemplates: string[];
  primaryColor: string;
  secondaryColor: string;
  /** Hero CTA button label */
  ctaLabel: string;
  /** Nav + page heading for the menu/services section */
  menuLabel: string;
  /** Individual item noun */
  menuItemLabel: string;
  /** Eyebrow above featured section */
  featuredEyebrow: string;
  /** Heading for featured section */
  featuredHeading: string;
  /** Staff role noun */
  expertLabel: string;
}

// ── 5 MASTER TEMPLATES ────────────────────────────────────────────────────────

export const MASTER_TEMPLATES: PageTemplate[] = [
  {
    id: 'grande',
    name: 'The Grande',
    tagline: 'Luxury · Immersive full-screen hero · Serif elegance',
    description: 'Full-screen dark hero with rich serif typography and a dramatic hanging content overlay. Best for fine dining and high-end experiences.',
    primaryColor: '#C4A35A',
    secondaryColor: '#A0843E',
    fontFamily: 'Playfair Display',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    surfaceColor: '#0A0906',
    heroStyle: 'dark',
    cardStyle: 'large',
    hangingHero: true,
    previewGradient: 'from-stone-950 via-gray-900 to-black',
    previewTextColor: 'text-amber-300',
  },
  {
    id: 'boutique',
    name: 'The Boutique',
    tagline: 'Elegant · Soft pastels · Generous white space',
    description: 'Light airy hero with overlapping sections and refined typography. Feminine and polished — perfect for salons, bakeries and boutiques.',
    primaryColor: '#BE8A60',
    secondaryColor: '#A0714A',
    fontFamily: 'Playfair Display',
    headingFont: 'Playfair Display',
    bodyFont: 'Quicksand',
    surfaceColor: '#FDF8F4',
    heroStyle: 'luxe',
    cardStyle: 'large',
    hangingHero: false,
    previewGradient: 'from-rose-50 via-amber-50 to-stone-100',
    previewTextColor: 'text-stone-800',
  },
  {
    id: 'professional',
    name: 'The Professional',
    tagline: 'Service-first · Clean lines · Clear CTAs',
    description: 'Split-panel hero with sharp grid layout and prominent calls-to-action. Built for repair shops, clinics and any business that sells expertise.',
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E40AF',
    fontFamily: 'Montserrat',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    surfaceColor: '#F5F8FF',
    heroStyle: 'split',
    cardStyle: 'grid',
    hangingHero: false,
    previewGradient: 'from-blue-800 via-blue-950 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'urban',
    name: 'The Urban',
    tagline: 'Dark mode · Vivid neon accent · Hanging hero',
    description: 'Dark immersive hero with electric neon accents and a dramatic hanging content reveal. The go-to for barbers, modern cafés and bars.',
    primaryColor: '#A855F7',
    secondaryColor: '#7C3AED',
    fontFamily: 'Montserrat',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    surfaceColor: '#09090B',
    heroStyle: 'neon',
    cardStyle: 'grid',
    hangingHero: true,
    showLogo: false,
    previewGradient: 'from-purple-950 via-gray-950 to-black',
    previewTextColor: 'text-purple-300',
  },
  {
    id: 'minimalist',
    name: 'The Minimalist',
    tagline: 'Thin lines · Centred logo · Refined simplicity',
    description: 'Typography-first white hero with structured layout below. Every element earns its place — perfect for traditional restaurants and private clinics.',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    fontFamily: 'Inter',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    surfaceColor: '#FAFAFA',
    heroStyle: 'typographic',
    cardStyle: 'large',
    hangingHero: false,
    showLogo: false,
    previewGradient: 'from-white via-gray-50 to-gray-100',
    previewTextColor: 'text-gray-900',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'Letterbox bars · Panoramic · Film aesthetic',
    description: 'Widescreen letterbox hero with cinematic overlay bars and a dramatic hanging reveal. Turns your space into a film still.',
    primaryColor: '#E11D48',
    secondaryColor: '#BE123C',
    fontFamily: 'Playfair Display',
    headingFont: 'Playfair Display',
    bodyFont: 'Inter',
    surfaceColor: '#0A0A0A',
    heroStyle: 'cinematic',
    cardStyle: 'large',
    hangingHero: true,
    showLogo: false,
    previewGradient: 'from-black via-gray-900 to-black',
    previewTextColor: 'text-white',
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Bold dark hero · High-contrast · Timeless',
    description: 'Strong full-bleed dark hero with bold typography and vivid accent colour. Works for any business that wants to make an immediate impact.',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    fontFamily: 'Montserrat',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    surfaceColor: '#111827',
    heroStyle: 'dark',
    cardStyle: 'grid',
    hangingHero: true,
    previewGradient: 'from-red-800 via-gray-900 to-gray-950',
    previewTextColor: 'text-white',
  },
  {
    id: 'cozy',
    name: 'Cozy Corner',
    tagline: 'Warm amber · Soft serif · Inviting atmosphere',
    description: 'Warm, soft-toned hero with Playfair Display headings and Quicksand body text. The most welcoming template on the platform.',
    primaryColor: '#92400E',
    secondaryColor: '#78350F',
    fontFamily: 'Playfair Display',
    headingFont: 'Playfair Display',
    bodyFont: 'Quicksand',
    surfaceColor: '#FEF3C7',
    heroStyle: 'cozy',
    cardStyle: 'grid',
    hangingHero: false,
    previewGradient: 'from-amber-100 via-orange-50 to-stone-100',
    previewTextColor: 'text-amber-900',
  },
];

// ── BUSINESS PRESETS ──────────────────────────────────────────────────────────

export const BUSINESS_PRESETS: Record<BusinessType, BusinessPreset> = {
  RESTAURANT: {
    type: 'RESTAURANT',
    label: 'Restaurant',
    recommendedTemplates: ['grande', 'cinematic', 'classic'],
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    ctaLabel: 'Order Online',
    menuLabel: 'Menu',
    menuItemLabel: 'Dish',
    featuredEyebrow: 'From the Kitchen',
    featuredHeading: 'Featured Dishes',
    expertLabel: 'Chef',
  },
  CAFE: {
    type: 'CAFE',
    label: 'Café',
    recommendedTemplates: ['cozy', 'boutique', 'minimalist'],
    primaryColor: '#92400E',
    secondaryColor: '#78350F',
    ctaLabel: 'Order Online',
    menuLabel: 'Menu',
    menuItemLabel: 'Item',
    featuredEyebrow: 'On the Menu',
    featuredHeading: "Today's Picks",
    expertLabel: 'Barista',
  },
  BARBER_SHOP: {
    type: 'BARBER_SHOP',
    label: 'Barber Shop',
    recommendedTemplates: ['urban', 'classic', 'professional'],
    primaryColor: '#09090B',
    secondaryColor: '#27272A',
    ctaLabel: 'Book Appointment',
    menuLabel: 'Services',
    menuItemLabel: 'Service',
    featuredEyebrow: 'What We Do',
    featuredHeading: 'Popular Cuts',
    expertLabel: 'Barber',
  },
  SALON: {
    type: 'SALON',
    label: 'Salon',
    recommendedTemplates: ['boutique', 'grande', 'minimalist'],
    primaryColor: '#BE8A60',
    secondaryColor: '#A0714A',
    ctaLabel: 'Book Appointment',
    menuLabel: 'Services',
    menuItemLabel: 'Treatment',
    featuredEyebrow: 'Our Specialities',
    featuredHeading: 'Popular Treatments',
    expertLabel: 'Stylist',
  },
  GYM: {
    type: 'GYM',
    label: 'Gym & Fitness',
    recommendedTemplates: ['urban', 'classic', 'professional'],
    primaryColor: '#DC2626',
    secondaryColor: '#B91C1C',
    ctaLabel: 'Join Now',
    menuLabel: 'Programs',
    menuItemLabel: 'Class',
    featuredEyebrow: 'Train With Us',
    featuredHeading: 'Popular Classes',
    expertLabel: 'Trainer',
  },
  REPAIR_SHOP: {
    type: 'REPAIR_SHOP',
    label: 'Repair Shop',
    recommendedTemplates: ['professional', 'minimalist', 'urban'],
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E40AF',
    ctaLabel: 'Request Quote',
    menuLabel: 'Services',
    menuItemLabel: 'Service',
    featuredEyebrow: 'What We Fix',
    featuredHeading: 'Our Services',
    expertLabel: 'Technician',
  },
  OTHER: {
    type: 'OTHER',
    label: 'Business',
    recommendedTemplates: ['professional', 'minimalist', 'boutique'],
    primaryColor: '#334155',
    secondaryColor: '#475569',
    ctaLabel: 'Get in Touch',
    menuLabel: 'Services',
    menuItemLabel: 'Service',
    featuredEyebrow: 'What We Offer',
    featuredHeading: 'Our Services',
    expertLabel: 'Expert',
  },
};

// ── LEGACY ID MIGRATION ───────────────────────────────────────────────────────
// Maps old 37-template IDs to the nearest master template.
// Ensures existing tenant savedPageTemplate values still resolve correctly.
const LEGACY_MAP: Record<string, string> = {
  // Old 37-template IDs → nearest master or restored template
  elegant: 'grande', modern: 'minimalist', fresh: 'boutique',
  neon: 'urban', typographic: 'minimalist', sunset: 'boutique', magazine: 'grande',
  split: 'professional', geometric: 'minimalist', bold: 'urban',
  grand: 'grande', vintage: 'minimalist', luxe: 'boutique',
  power: 'urban', light: 'boutique', dark: 'grande', centered: 'grande',
  'cafe-cozy': 'cozy', 'cafe-espresso': 'classic', 'cafe-bloom': 'boutique', 'cafe-sunset': 'boutique',
  'barber-vintage': 'minimalist', 'barber-navy': 'professional', 'barber-urban': 'urban', 'barber-neon': 'urban',
  'salon-luxe': 'boutique', 'salon-glam': 'grande', 'salon-blush': 'boutique', 'salon-minimal': 'minimalist',
  'gym-power': 'urban', 'gym-steel': 'urban', 'gym-neon': 'urban', 'gym-minimal': 'professional',
  'repair-pro': 'professional', 'repair-clean': 'professional', 'repair-bold': 'professional',
  'other-professional': 'professional', 'other-minimal': 'minimalist', 'other-vibrant': 'urban',
};

// ── PUBLIC API ────────────────────────────────────────────────────────────────

export function getPageTemplate(id?: string | null): PageTemplate {
  if (!id) return MASTER_TEMPLATES[0];
  const direct = MASTER_TEMPLATES.find((t) => t.id === id);
  if (direct) return direct;
  const migratedId = LEGACY_MAP[id];
  return MASTER_TEMPLATES.find((t) => t.id === migratedId) ?? MASTER_TEMPLATES[0];
}

export function getBusinessPreset(type?: string | null): BusinessPreset {
  return BUSINESS_PRESETS[(type as BusinessType)] ?? BUSINESS_PRESETS.OTHER;
}

/** 3 templates recommended for this business type (shown first in picker) */
export function getRecommendedTemplates(type?: string | null): PageTemplate[] {
  const preset = getBusinessPreset(type);
  return preset.recommendedTemplates
    .map((id) => MASTER_TEMPLATES.find((t) => t.id === id)!)
    .filter(Boolean);
}

/** All 5 master templates */
export function getAllTemplates(): PageTemplate[] {
  return MASTER_TEMPLATES;
}

// Backwards-compat aliases
export function getTemplatesForType(_type?: string | null): PageTemplate[] {
  return MASTER_TEMPLATES;
}
export const RESTAURANT_PAGE_TEMPLATES = MASTER_TEMPLATES;
export const TEMPLATES_BY_TYPE: Record<string, PageTemplate[]> = Object.fromEntries(
  ['RESTAURANT', 'CAFE', 'BARBER_SHOP', 'SALON', 'GYM', 'REPAIR_SHOP', 'OTHER'].map((k) => [k, MASTER_TEMPLATES])
);
