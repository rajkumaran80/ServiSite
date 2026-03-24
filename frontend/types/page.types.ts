export type SectionType =
  | 'hero'
  | 'text'
  | 'image_text'
  | 'features'
  | 'gallery'
  | 'cta'
  | 'contact_info'
  | 'divider';

export interface HeroContent {
  heading: string;
  subheading?: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonHref?: string;
  overlay?: boolean;
}

export interface TextContent {
  heading?: string;
  body: string; // markdown-lite: supports **bold** and line breaks
  align?: 'left' | 'center' | 'right';
}

export interface ImageTextContent {
  heading?: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  imagePosition?: 'left' | 'right';
  buttonLabel?: string;
  buttonHref?: string;
}

export interface Feature {
  icon?: string; // emoji or icon name
  title: string;
  description: string;
}

export interface FeaturesContent {
  heading?: string;
  subheading?: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
}

export interface GalleryContent {
  heading?: string;
  images: Array<{ url: string; caption?: string }>;
}

export interface CtaContent {
  heading: string;
  subheading?: string;
  buttonLabel: string;
  buttonHref: string;
  variant?: 'primary' | 'dark' | 'light';
}

export interface ContactInfoContent {
  heading?: string;
  showMap?: boolean;
  showHours?: boolean;
}

export interface DividerContent {
  style?: 'line' | 'dots' | 'wave';
}

export type SectionContent =
  | HeroContent
  | TextContent
  | ImageTextContent
  | FeaturesContent
  | GalleryContent
  | CtaContent
  | ContactInfoContent
  | DividerContent;

export interface PageSection {
  id: string;
  type: SectionType;
  order: number;
  content: SectionContent;
}

export interface CmsPage {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  sections: PageSection[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
