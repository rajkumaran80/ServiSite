/**
 * Smart theme generator — derives text colours, shadows, and button styles
 * automatically from the user's chosen primary colour so the design always
 * stays readable without needing manual text-colour pickers.
 */

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
  /** Primary text — white on dark, near-black on light */
  mainText: string;
  /** Secondary / muted text */
  secondaryText: string;
  /** Tinted card shadow using the primary colour at low opacity */
  tileShadow: string;
  /** Inverted background for CTA buttons */
  buttonBg: string;
  /** Text colour for CTA buttons */
  buttonText: string;
  /** Hover background as rgba string */
  hoverBg: string;
  /** Active / selected background */
  activeBg: string;
  /** Border colour */
  borderColor: string;
}

export function generateTheme(primaryColor: string): SmartTheme {
  const light = isLightColor(primaryColor);
  return {
    isLight: light,
    mainText:      light ? '#1A1A1A' : '#FFFFFF',
    secondaryText: light ? 'rgba(0,0,0,0.58)' : 'rgba(255,255,255,0.72)',
    tileShadow:    hexToRgba(primaryColor, 0.15),
    buttonBg:      light ? '#111111' : '#FFFFFF',
    buttonText:    light ? '#FFFFFF' : '#111111',
    hoverBg:       light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
    activeBg:      light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.22)',
    borderColor:   light ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.30)',
  };
}
