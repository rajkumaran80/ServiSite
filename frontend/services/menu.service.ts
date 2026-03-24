import { api } from './api';
import type {
  Category,
  MenuItem,
  MenuGroup,
  FullMenu,
  CreateCategoryPayload,
  CreateMenuItemPayload,
  CreateMenuGroupPayload,
  UpdateMenuItemPayload,
} from '../types/menu.types';

// Backend returns categories as [{id, name}] — normalize to categoryIds: string[]
function normalizeItem(raw: any): MenuItem {
  return {
    ...raw,
    categoryIds: (raw.categoryIds ?? raw.categories ?? []).map((c: any) =>
      typeof c === 'string' ? c : c.id,
    ),
  };
}

class MenuService {
  // Menu Groups
  async getGroups(tenantSlug?: string): Promise<MenuGroup[]> {
    const headers = tenantSlug ? { 'X-Tenant-ID': tenantSlug } : {};
    const response = await api.get<{ data: MenuGroup[] }>('/menu/groups', { headers });
    return response.data.data;
  }

  async createGroup(payload: CreateMenuGroupPayload): Promise<MenuGroup> {
    const response = await api.post<{ data: MenuGroup }>('/menu/groups', payload);
    return response.data.data;
  }

  async updateGroup(id: string, payload: Partial<CreateMenuGroupPayload>): Promise<MenuGroup> {
    const response = await api.put<{ data: MenuGroup }>(`/menu/groups/${id}`, payload);
    return response.data.data;
  }

  async deleteGroup(id: string): Promise<void> {
    await api.delete(`/menu/groups/${id}`);
  }

  async reorderGroups(groups: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await api.put('/menu/groups/reorder', { groups });
  }

  // Categories
  async getCategories(tenantSlug?: string): Promise<Category[]> {
    const headers = tenantSlug ? { 'X-Tenant-ID': tenantSlug } : {};
    const response = await api.get<{ data: Category[] }>('/menu/categories', { headers });
    return response.data.data;
  }

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const response = await api.post<{ data: Category }>('/menu/categories', payload);
    return response.data.data;
  }

  async updateCategory(id: string, payload: Partial<CreateCategoryPayload>): Promise<Category> {
    const response = await api.put<{ data: Category }>(`/menu/categories/${id}`, payload);
    return response.data.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/menu/categories/${id}`);
  }

  // Menu Items
  async getItems(
    options?: { categoryId?: string; available?: boolean; tenantSlug?: string },
  ): Promise<MenuItem[]> {
    const params: Record<string, any> = {};
    if (options?.categoryId) params.categoryId = options.categoryId;
    if (options?.available !== undefined) params.available = options.available;

    const headers = options?.tenantSlug ? { 'X-Tenant-ID': options.tenantSlug } : {};
    const response = await api.get<{ data: any[] }>('/menu/items', { params, headers });
    return response.data.data.map(normalizeItem);
  }

  async getFullMenu(tenantSlug?: string): Promise<FullMenu> {
    const headers = tenantSlug ? { 'X-Tenant-ID': tenantSlug } : {};
    const response = await api.get<{ data: FullMenu }>('/menu/full', { headers });
    return response.data.data;
  }

  async createItem(payload: CreateMenuItemPayload): Promise<MenuItem> {
    const response = await api.post<{ data: any }>('/menu/items', payload);
    return normalizeItem(response.data.data);
  }

  async updateItem(id: string, payload: UpdateMenuItemPayload): Promise<MenuItem> {
    const response = await api.put<{ data: any }>(`/menu/items/${id}`, payload);
    return normalizeItem(response.data.data);
  }

  async deleteItem(id: string): Promise<void> {
    await api.delete(`/menu/items/${id}`);
  }

  async reorderItems(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await api.put('/menu/items/reorder', { items });
  }

  formatPrice(price: string | number, currency = 'GBP', locale = 'en-GB'): string {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numericPrice);
  }
}

export const menuService = new MenuService();
export default menuService;
