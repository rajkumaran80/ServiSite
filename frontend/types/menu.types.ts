export interface MenuGroup {
  id: string;
  tenantId: string;
  name: string;
  icon: string | null;
  description: string | null;
  headerText: string | null;
  footerText: string | null;
  servedFrom: string | null;
  servedUntil: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    categories: number;
  };
  categories?: Array<Category & { menuItems: MenuItem[] }>;
}

export interface Category {
  id: string;
  tenantId: string;
  menuGroupId?: string | null;
  name: string;
  description: string | null;
  headerText: string | null;
  footerText: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    menuItems: number;
  };
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  tenantId: string;
  categoryIds: string[];
  name: string;
  description: string | null;
  price: string | number;
  currency: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isPopular: boolean;
  allergens: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: Pick<Category, 'id' | 'name'> | null;
}

export interface FullMenu {
  groups: Array<MenuGroup & { categories: Array<Category & { menuItems: MenuItem[] }> }>;
  uncategorized: MenuItem[];
}

export interface CreateMenuGroupPayload {
  name: string;
  icon?: string;
  description?: string;
  headerText?: string;
  footerText?: string;
  servedFrom?: string;
  servedUntil?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  headerText?: string;
  footerText?: string;
  sortOrder?: number;
  menuGroupId?: string;
}

export interface CreateMenuItemPayload {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isPopular?: boolean;
  allergens?: string[];
  sortOrder?: number;
  categoryIds?: string[];
}

export interface UpdateMenuItemPayload extends Partial<CreateMenuItemPayload> {}

export interface ItemVariant {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface HalfHalfConfig {
  id: string;
  tenantId: string;
  name: string;
  leftItemId: string;
  rightItemId: string;
  pricingMode: 'MAX' | 'AVERAGE' | 'SUM';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  leftItem?: { id: string; name: string; price: number };
  rightItem?: { id: string; name: string; price: number };
}
