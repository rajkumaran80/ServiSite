import { api } from './api';
import type {
  Tenant,
  ContactInfo,
  TenantStats,
  UpdateTenantPayload,
  CreateTenantPayload,
} from '../types/tenant.types';

class TenantService {
  async getBySlug(slug: string): Promise<Tenant> {
    const response = await api.get<{ data: Tenant }>(`/tenant/${slug}`);
    return response.data.data;
  }

  async getAll(): Promise<Tenant[]> {
    const response = await api.get<{ data: Tenant[] }>('/tenant');
    return response.data.data;
  }

  async create(payload: CreateTenantPayload): Promise<Tenant> {
    const response = await api.post<{ data: Tenant }>('/tenant', payload);
    return response.data.data;
  }

  async update(id: string, payload: UpdateTenantPayload): Promise<Tenant> {
    const response = await api.put<{ data: Tenant }>(`/tenant/${id}`, payload);
    return response.data.data;
  }

  async getStats(id: string): Promise<TenantStats> {
    const response = await api.get<{ data: TenantStats }>(`/tenant/${id}/stats`);
    return response.data.data;
  }

  async getContact(tenantSlug?: string): Promise<ContactInfo> {
    const headers = tenantSlug ? { 'X-Tenant-ID': tenantSlug } : {};
    const response = await api.get<{ data: ContactInfo }>('/contact', { headers });
    return response.data.data;
  }

  async updateContact(payload: Partial<ContactInfo>): Promise<ContactInfo> {
    const response = await api.put<{ data: ContactInfo }>('/contact', payload);
    return response.data.data;
  }
}

export const tenantService = new TenantService();
export default tenantService;
