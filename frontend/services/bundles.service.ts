import { api } from './api';

export interface BundleSlotSource {
  sourceType: 'MENU_GROUP' | 'CATEGORY' | 'ITEM';
  sourceId: string;
}

export interface BundleSlot {
  id?: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  sortOrder?: number;
  sources: BundleSlotSource[];
}

export interface Bundle {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricingType: 'FIXED' | 'SUM' | 'DISCOUNTED';
  basePrice: number | null;
  discountPct: number | null;
  isActive: boolean;
  sortOrder: number;
  slots: BundleSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBundlePayload {
  name: string;
  description?: string;
  imageUrl?: string;
  pricingType: 'FIXED' | 'SUM' | 'DISCOUNTED';
  basePrice?: number;
  discountPct?: number;
  isActive?: boolean;
  sortOrder?: number;
  slots?: BundleSlot[];
}

class BundlesService {
  async listAll(): Promise<Bundle[]> {
    const res = await api.get<{ data: Bundle[] }>('/bundles/all');
    return res.data.data;
  }

  async listPublic(): Promise<Bundle[]> {
    const res = await api.get<{ data: Bundle[] }>('/bundles');
    return res.data.data;
  }

  async getOne(id: string): Promise<Bundle> {
    const res = await api.get<{ data: Bundle }>(`/bundles/${id}`);
    return res.data.data;
  }

  async create(payload: CreateBundlePayload): Promise<Bundle> {
    const res = await api.post<{ data: Bundle }>('/bundles', payload);
    return res.data.data;
  }

  async update(id: string, payload: Partial<CreateBundlePayload>): Promise<Bundle> {
    const res = await api.put<{ data: Bundle }>(`/bundles/${id}`, payload);
    return res.data.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/bundles/${id}`);
  }
}

export const bundlesService = new BundlesService();
export default bundlesService;
