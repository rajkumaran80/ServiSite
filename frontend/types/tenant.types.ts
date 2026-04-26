export type TenantType = 'RESTAURANT' | 'CAFE' | 'BARBER_SHOP' | 'SALON' | 'GYM' | 'REPAIR_SHOP' | 'OTHER';
export type ServiceProfile = 'FOOD_SERVICE' | 'GENERAL_SERVICE';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoPosition?: 'left' | 'center';
  heroStyle?: 'full' | 'compact';
  pageTemplate?: string;
  promoImageUrl?: string;
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
  serviceProfile: ServiceProfile;
  logo: string | null;
  banner: string | null;
  themeSettings: ThemeSettings | null;
  currency: string;
  timezone: string;
  locale: string;
  whatsappNumber: string | null;
  qrCodeUrl: string | null;
  createdAt: string;
  updatedAt: string;
  customDomain?: string | null;
  customDomainStatus?: 'pending' | 'active' | 'failed' | null;
  customDomainToken?: string | null;
  customDomainTxtName?: string | null;
  customDomainTxtValue?: string | null;
  customDomainVerifiedAt?: string | null;
  customDomainNsRecords?: string[];
  routingPreference?: 'direct' | 'frontdoor' | null;
  // Facebook integration
  facebookPageId?: string | null;
  facebookPageName?: string | null;
  contactInfo?: ContactInfo | null;
  _count?: {
    menuItems: number;
    gallery: number;
    categories: number;
  };
}

export interface ContactInfo {
  id: string;
  tenantId: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  mapUrl: string | null;
  nearTo: string | null;
  openingHours: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImage {
  id: string;
  tenantId: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  mediaType?: string;
  createdAt: string;
}

export interface TenantStats {
  menuItems: number;
  categories: number;
  galleryImages: number;
}

export interface UpdateTenantPayload {
  name?: string;
  type?: TenantType;
  logo?: string;
  banner?: string;
  themeSettings?: Partial<ThemeSettings>;
  currency?: string;
  timezone?: string;
  locale?: string;
  whatsappNumber?: string;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  type?: TenantType;
  adminEmail: string;
  adminPassword: string;
  currency?: string;
  timezone?: string;
  locale?: string;
}
