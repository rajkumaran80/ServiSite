export type TenantType = 'RESTAURANT' | 'SALON' | 'REPAIR_SHOP' | 'OTHER';

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoPosition?: 'left' | 'center';
  heroStyle?: 'full' | 'compact';
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: TenantType;
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
