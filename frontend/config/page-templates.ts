export interface PageTemplate {
  id: string;
  name: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  heroStyle: 'dark' | 'centered' | 'minimal' | 'light';
  cardStyle: 'grid' | 'large';
  /** Tailwind gradient for picker preview card */
  previewGradient: string;
  previewTextColor: string;
}

/** Templates available for restaurant / cafe type businesses */
export const RESTAURANT_PAGE_TEMPLATES: PageTemplate[] = [
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
];

export function getPageTemplate(id?: string | null): PageTemplate {
  return RESTAURANT_PAGE_TEMPLATES.find((t) => t.id === id) ?? RESTAURANT_PAGE_TEMPLATES[0];
}
