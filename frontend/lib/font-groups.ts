/**
 * Font Groups — independent of colour groups.
 * Font stacks use Next.js CSS variable references (var(--font-xxx)) because
 * Next.js font optimisation exposes fonts via hashed @font-face names, not
 * the plain font name string. Plain names fall back to system fonts silently.
 *
 * CSS vars are set on <html> by the root layout and available on all pages.
 */

export interface FontGroup {
  id: string;
  label: string;
  tagline: string;
  feel: string;

  /** CSS font-family value using var(--font-xxx) — used in layout injection */
  headingFontStack: string;
  bodyFontStack: string;
  /** Buttons, nav, labels — defaults to bodyFontStack if omitted */
  uiFontStack?: string;

  letterSpacing: string;
  headingWeight: number;
  uppercaseHeadings: boolean;

  previewHeading: string;
  previewBody: string;
}

export const FONT_GROUPS: FontGroup[] = [
  {
    // Josefin Sans — closest open-source match to Futura (geometric, single-story a, sharp apexes)
    id: 'geometric',
    label: 'Geometric',
    tagline: 'Bistro · Café · Modern Dining',
    feel: 'Josefin Sans is the closest Google Font to Futura — sharp, geometric, architectural. Paired with DM Sans for a clean modern body.',
    headingFontStack: "var(--font-josefin-sans), 'Century Gothic', system-ui, sans-serif",
    bodyFontStack:    "var(--font-dm-sans), system-ui, sans-serif",
    uiFontStack:      "var(--font-josefin-sans), system-ui, sans-serif",
    letterSpacing:    '0.08em',
    headingWeight:    700,
    uppercaseHeadings: true,
    previewHeading:   'Built on Passion',
    previewBody:      'Fresh ingredients, bold ideas.',
  },
  {
    // Playfair Display — high-contrast serif, fine dining drama
    id: 'classic',
    label: 'Classic Serif',
    tagline: 'Fine Dining · Heritage · Wine Bars',
    feel: 'Playfair Display has extreme contrast between thick and thin strokes — unmistakably editorial. Lato keeps body text clean.',
    headingFontStack: "var(--font-playfair), Georgia, serif",
    bodyFontStack:    "var(--font-lato), system-ui, sans-serif",
    uiFontStack:      "var(--font-lato), system-ui, sans-serif",
    letterSpacing:    '0.01em',
    headingWeight:    700,
    uppercaseHeadings: false,
    previewHeading:   'A Table for Two',
    previewBody:      'Where every evening becomes a memory.',
  },
  {
    // Montserrat bold heading + Inter body — versatile all-rounder
    id: 'contemporary',
    label: 'Contemporary',
    tagline: 'Restaurants · Bars · All Businesses',
    feel: 'Montserrat headings with Inter body — balanced, professional, reads well at every size.',
    headingFontStack: "var(--font-montserrat), system-ui, sans-serif",
    bodyFontStack:    "var(--font-inter), system-ui, sans-serif",
    uiFontStack:      "var(--font-montserrat), system-ui, sans-serif",
    letterSpacing:    '0.03em',
    headingWeight:    800,
    uppercaseHeadings: false,
    previewHeading:   'Good Food, Good People',
    previewBody:      'Open seven days. Always a warm welcome.',
  },
  {
    // Libre Baskerville + Source Serif — full-serif editorial look
    id: 'editorial',
    label: 'Editorial',
    tagline: 'Artisan · Bakeries · Delis · Wine',
    feel: 'Both heading and body are serif — a full newspaper feel. Libre Baskerville is bold and punchy; Source Serif 4 is legible and warm.',
    headingFontStack: "var(--font-libre-baskerville), Georgia, serif",
    bodyFontStack:    "var(--font-source-serif-4), Georgia, serif",
    uiFontStack:      "var(--font-lato), system-ui, sans-serif",
    letterSpacing:    '0.005em',
    headingWeight:    700,
    uppercaseHeadings: false,
    previewHeading:   'Crafted Since 1987',
    previewBody:      'Slow-fermented sourdough. No shortcuts.',
  },
  {
    // Oswald condensed — tight, bold, very different from above
    id: 'industrial',
    label: 'Industrial',
    tagline: 'Street Food · Pizza · BBQ · Burgers',
    feel: 'Oswald is ultra-condensed — headings take up half the horizontal space, making them punchy and very distinct from any other group.',
    headingFontStack: "var(--font-oswald), system-ui, sans-serif",
    bodyFontStack:    "var(--font-roboto), system-ui, sans-serif",
    uiFontStack:      "var(--font-oswald), system-ui, sans-serif",
    letterSpacing:    '0.1em',
    headingWeight:    600,
    uppercaseHeadings: true,
    previewHeading:   'Smash Burger Co.',
    previewBody:      'Double patty. Double good.',
  },
  {
    // Nunito — extra rounded letterforms, soft and friendly
    id: 'soft',
    label: 'Soft & Friendly',
    tagline: 'Desserts · Brunch · Juice Bars',
    feel: 'Nunito has distinctly rounded terminals on every letter — noticeably rounder than Inter or Roboto. Joyful and approachable.',
    headingFontStack: "var(--font-nunito), system-ui, sans-serif",
    bodyFontStack:    "var(--font-nunito), system-ui, sans-serif",
    uiFontStack:      "var(--font-nunito), system-ui, sans-serif",
    letterSpacing:    '0.01em',
    headingWeight:    800,
    uppercaseHeadings: false,
    previewHeading:   'Sweet Things',
    previewBody:      'Handmade with love every morning.',
  },
  {
    // Cormorant Garamond — ultra-high contrast, hair-thin strokes, luxury
    id: 'luxury',
    label: 'Luxury',
    tagline: 'Tasting Menus · Champagne Bars',
    feel: 'Cormorant Garamond has the thinnest hairline strokes of any commonly available font — dramatically different from every other group. Paired with Jost for a clean, geometric sans body.',
    headingFontStack: "var(--font-cormorant-garamond), Georgia, serif",
    bodyFontStack:    "var(--font-jost), system-ui, sans-serif",
    uiFontStack:      "var(--font-jost), system-ui, sans-serif",
    letterSpacing:    '0.04em',
    headingWeight:    600,
    uppercaseHeadings: false,
    previewHeading:   'An Evening to Remember',
    previewBody:      'Eight courses. Seasonal. Intimate.',
  },
  {
    // Quicksand — rounded, lighter weight, slightly whimsical
    id: 'whimsical',
    label: 'Whimsical',
    tagline: 'Ice Cream · Kids Menus · Brunch',
    feel: 'Quicksand combines rounded corners with a geometric structure — playful but not childish. Noticeably lighter and softer than Nunito.',
    headingFontStack: "var(--font-quicksand), system-ui, sans-serif",
    bodyFontStack:    "var(--font-quicksand), system-ui, sans-serif",
    uiFontStack:      "var(--font-quicksand), system-ui, sans-serif",
    letterSpacing:    '0.02em',
    headingWeight:    700,
    uppercaseHeadings: false,
    previewHeading:   'Sundae Funday',
    previewBody:      'Every flavour is a good decision.',
  },
  {
    // Caviar Dreams — local font, clean art deco geometry, feels premium but approachable
    id: 'artdeco',
    label: 'Art Deco',
    tagline: 'Cocktail Bars · Boutique Hotels · Upscale Cafés',
    feel: 'Caviar Dreams has a distinct art deco character — clean geometric lines with subtle elegance. Very different from any web-standard font.',
    headingFontStack: "var(--font-caviar), 'Century Gothic', system-ui, sans-serif",
    bodyFontStack:    "var(--font-caviar), 'Century Gothic', system-ui, sans-serif",
    uiFontStack:      "var(--font-caviar), 'Century Gothic', system-ui, sans-serif",
    letterSpacing:    '0.06em',
    headingWeight:    700,
    uppercaseHeadings: false,
    previewHeading:   'The Grand Lounge',
    previewBody:      'Cocktails, classics, and good company.',
  },
  {
    // Shantell Sans + Short Stack — handwritten, informal, personal warmth
    id: 'handwritten',
    label: 'Handwritten',
    tagline: 'Cafés · Brunch Spots · Creative Studios',
    feel: 'Shantell Sans is a flowing handwritten style — like a confident marker on a chalkboard. Short Stack keeps body text casual and legible.',
    headingFontStack: "var(--font-shantell-sans), cursive, system-ui, sans-serif",
    bodyFontStack:    "var(--font-short-stack), cursive, system-ui, sans-serif",
    uiFontStack:      "var(--font-shantell-sans), cursive, system-ui, sans-serif",
    letterSpacing:    '0.01em',
    headingWeight:    700,
    uppercaseHeadings: false,
    previewHeading:   'Made With Love',
    previewBody:      'Fresh bakes every morning from 7am.',
  },
  {
    // Comic Neue + Comic Relief — fun, casual, unapologetically friendly
    id: 'comic',
    label: 'Comic & Fun',
    tagline: 'Kids · Candy · Street Food · Party Venues',
    feel: 'Comic Neue is the grown-up Comic Sans — same friendly DNA but balanced and readable. Comic Relief adds more personality to longer text.',
    headingFontStack: "var(--font-comic-neue), 'Comic Sans MS', cursive, sans-serif",
    bodyFontStack:    "var(--font-comic-neue), 'Comic Sans MS', cursive, sans-serif",
    uiFontStack:      "var(--font-comic-neue), 'Comic Sans MS', cursive, sans-serif",
    letterSpacing:    '0.02em',
    headingWeight:    700,
    uppercaseHeadings: false,
    previewHeading:   'Fun Food For All',
    previewBody:      'Kids eat free on Sundays!',
  },
];

export function getFontGroup(id: string): FontGroup | undefined {
  return FONT_GROUPS.find((g) => g.id === id);
}
