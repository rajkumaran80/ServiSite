export interface PageField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'image' | 'images' | 'number';
  required?: boolean;
  placeholder?: string;
}

export interface PredefinedPage {
  key: string;
  label: string;
  /** Label override for restaurant-type businesses */
  restaurantLabel?: string;
  slug: string;
  icon: string;
  description: string;
  /** What a single entry is called (e.g. "Event") — empty for built-in pages */
  itemLabel: string;
  itemFields: PageField[];
  /** Cannot be toggled off */
  alwaysOn?: boolean;
  /** Has no manageable entries — just a built-in page */
  builtIn?: boolean;
  /** Default enabled state */
  defaultEnabled?: boolean;
}

export const PREDEFINED_PAGES: PredefinedPage[] = [
  {
    key: 'home',
    label: 'Home',
    slug: '',
    icon: '🏠',
    description: 'Your main home page',
    itemLabel: '',
    itemFields: [],
    alwaysOn: true,
    builtIn: true,
    defaultEnabled: true,
  },
  {
    key: 'menu',
    label: 'Menu',
    restaurantLabel: 'Menu',
    slug: 'menu',
    icon: '🍽️',
    description: 'Your menu or services list',
    itemLabel: '',
    itemFields: [],
    builtIn: true,
    defaultEnabled: true,
  },
  {
    key: 'events',
    label: 'Special Events',
    slug: 'events',
    icon: '🎉',
    description: 'Upcoming special events and parties',
    itemLabel: 'Event',
    itemFields: [
      { key: 'title', label: 'Event Name', type: 'text', required: true, placeholder: "e.g. New Year's Eve Party" },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'text', placeholder: 'e.g. 9PM – 2AM' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: "What's happening at this event?" },
      { key: 'imageUrl', label: 'Poster Image', type: 'image', placeholder: 'https://...' },
      { key: 'photos', label: 'Photo Gallery', type: 'images' },
      { key: 'price', label: 'Ticket / Entry Price', type: 'text', placeholder: 'e.g. $20 or Free' },
    ],
    defaultEnabled: false,
  },
  {
    key: 'dj-nights',
    label: 'DJ Nights',
    slug: 'dj-nights',
    icon: '🎵',
    description: 'DJ nights and live music events',
    itemLabel: 'DJ Night',
    itemFields: [
      { key: 'title', label: 'Event Title', type: 'text', required: true, placeholder: 'e.g. Saturday Night Live' },
      { key: 'djName', label: 'DJ / Artist Name', type: 'text', placeholder: 'e.g. DJ Maxxx' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'time', label: 'Time', type: 'text', placeholder: 'e.g. 10PM – 3AM' },
      { key: 'genre', label: 'Music Genre', type: 'text', placeholder: 'e.g. House, Hip-Hop' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'imageUrl', label: 'Flyer Image', type: 'image', placeholder: 'https://...' },
      { key: 'photos', label: 'Photo Gallery', type: 'images' },
      { key: 'price', label: 'Entry Fee', type: 'text', placeholder: 'e.g. $15 or Free before 11PM' },
    ],
    defaultEnabled: false,
  },
  {
    key: 'offers',
    label: 'Offers & Promotions',
    slug: 'offers',
    icon: '🏷️',
    description: 'Current promotions and deals',
    itemLabel: 'Offer',
    itemFields: [
      { key: 'title', label: 'Offer Title', type: 'text', required: true, placeholder: 'e.g. Happy Hour' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Tell people about this offer' },
      { key: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://...' },
      { key: 'discount', label: 'Discount / Value', type: 'text', placeholder: 'e.g. 50% off, Buy 1 Get 1' },
      { key: 'validUntil', label: 'Valid Until', type: 'date' },
    ],
    defaultEnabled: false,
  },
  {
    key: 'about',
    label: 'About Us',
    slug: 'about',
    icon: 'ℹ️',
    description: 'Tell your story',
    itemLabel: 'Section',
    itemFields: [
      { key: 'title', label: 'Heading', type: 'text', placeholder: 'e.g. Our Story' },
      { key: 'description', label: 'Content', type: 'textarea', required: true },
      { key: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://...' },
    ],
    defaultEnabled: false,
  },
  {
    key: 'gallery',
    label: 'Gallery',
    slug: 'gallery',
    icon: '🖼️',
    description: 'Your photo gallery',
    itemLabel: '',
    itemFields: [],
    builtIn: true,
    defaultEnabled: true,
  },
  {
    key: 'contact',
    label: 'Contact',
    slug: 'contact',
    icon: '📍',
    description: 'Contact information and map',
    itemLabel: '',
    itemFields: [],
    builtIn: true,
    defaultEnabled: true,
  },
];

export function getPredefinedPage(key: string): PredefinedPage | undefined {
  return PREDEFINED_PAGES.find((p) => p.key === key);
}

/** Returns the nav-enabled map with defaults for any missing keys */
export function resolveNavPages(navPages: Record<string, boolean> | undefined): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const page of PREDEFINED_PAGES) {
    result[page.key] = navPages?.[page.key] ?? page.defaultEnabled ?? true;
  }
  return result;
}
