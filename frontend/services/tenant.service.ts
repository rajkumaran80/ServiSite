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

  async signup(payload: CreateTenantPayload): Promise<{ message: string }> {
    const response = await api.post<{ data: { message: string } }>('/tenant', payload);
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

  async setCustomDomain(tenantId: string, domain: string): Promise<{ nsRecords: string[] }> {
    const response = await api.post<{ data: { nsRecords: string[] } }>(
      `/tenant/${tenantId}/custom-domain`,
      { domain },
    );
    return response.data.data;
  }

  async verifyCustomDomain(tenantId: string): Promise<{ status: string }> {
    const response = await api.post<{ data: { status: string } }>(
      `/tenant/${tenantId}/custom-domain/verify`,
      {},
    );
    return response.data.data;
  }

  async removeCustomDomain(tenantId: string): Promise<void> {
    await api.delete(`/tenant/${tenantId}/custom-domain`);
  }
}

export const tenantService = new TenantService();
export default tenantService;
