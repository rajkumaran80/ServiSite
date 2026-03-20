export interface MenuGroup {
  id: string;
  tenantId: string;
  name: string;
  icon: string | null;
  description: string | null;
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
  categoryId: string | null;
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
  servedFrom?: string;
  servedUntil?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
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
  categoryId?: string;
}

export interface UpdateMenuItemPayload extends Partial<CreateMenuItemPayload> {}
