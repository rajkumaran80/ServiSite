export type SectionType =
  | 'hero'
  | 'text'
  | 'image_text'
  | 'features'
  | 'gallery'
  | 'cta'
  | 'contact_info'
  | 'divider'
  | 'data_table'
  | 'awards'
  | 'social_media'
  | 'google_reviews'
  | 'review_buttons'
  | 'image_only';

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

export interface DataTableContent {
  heading?: string;
  subheading?: string;
  headers: string[];
  rows: string[][];
  striped?: boolean;
  showBorder?: boolean;
}

export interface Award {
  title: string;
  subtitle?: string;
}

export interface AwardsContent {
  heading?: string;
  awards: Award[];
  backgroundColor?: string;
  textColor?: string;
}

export interface SocialMediaPost {
  id: string;
  imageUrl: string;
  caption: string;
  timestamp: string;
  likes?: number;
  comments?: number;
  videoUrl?: string;
  isVideo?: boolean;
}

export interface SocialMediaContent {
  heading?: string;
  subheading?: string;
  platform: 'instagram' | 'facebook';
  username: string;
  profileUrl: string;
  profileImageUrl?: string;
  posts: SocialMediaPost[];
  backgroundColor?: string;
  showFollowButton?: boolean;
  maxPosts?: number;
  // API integration settings
  useLiveFeed?: boolean;
  accessToken?: string;
  facebookPageId?: string;
  refreshInterval?: number; // in minutes
}

export interface GoogleReview {
  authorName: string;
  rating: number;
  text: string;
  time: string;
  profilePhotoUrl: string;
  reviewUrl: string;
}

export interface ManualReview {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  platform: 'google' | 'tripadvisor' | 'facebook' | 'instagram' | 'other';
  profilePhotoUrl?: string;
  time?: string;
  reviewUrl?: string;
}

export interface GoogleReviewsContent {
  heading?: string;
  subheading?: string;
  maxReviews?: number;
  backgroundColor?: string;
  showRating?: boolean;
  showWriteReviewButton?: boolean;
  minRating?: number;
  platforms?: {
    google?: boolean;
    tripadvisor?: boolean;
    facebook?: boolean;
    instagram?: boolean;
  };
  manualReviews?: ManualReview[];
}

export interface ReviewButton {
  id: string;
  label: string;
  url: string;
  platform?: string;
  imageUrl?: string;
  icon?: string;
  color?: string;
  order?: number;
}

export interface ReviewButtonsContent {
  heading?: string;
  subheading?: string;
  buttons: ReviewButton[];
  backgroundColor?: string;
  buttonStyle?: 'default' | 'rounded' | 'outlined';
  columns?: number; // 1-4 columns for grid layout
  showIcons?: boolean;
}

export interface ImageOnlyContent {
  imageUrl: string;
  alt?: string;
  backgroundColor?: string;
  fit?: 'contain' | 'cover' | 'fill';
  maxWidth?: number; // in pixels
  linkUrl?: string;
  openInNewTab?: boolean;
}

export type SectionContent =
  | HeroContent
  | TextContent
  | ImageTextContent
  | FeaturesContent
  | GalleryContent
  | CtaContent
  | ContactInfoContent
  | DividerContent
  | DataTableContent
  | AwardsContent
  | SocialMediaContent
  | GoogleReviewsContent
  | ReviewButtonsContent
  | ImageOnlyContent;

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
  isHomePage?: boolean; // Special flag for home page
}
