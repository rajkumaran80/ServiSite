import { api } from './api';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  currency: string;
  createdAt: string;
  _count: { users: number; menuItems: number };
  users: Array<{ email: string; createdAt: string }>;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  type: string;
  currency: string;
  adminEmail: string;
  adminPassword: string;
}

class SuperAdminService {
  async getStats() {
    const res = await api.get<{ data: { tenantCount: number; userCount: number; itemCount: number } }>('/superadmin/stats');
    return res.data.data;
  }

  async listTenants(): Promise<TenantSummary[]> {
    const res = await api.get<{ data: TenantSummary[] }>('/superadmin/tenants');
    return res.data.data;
  }

  async createTenant(payload: CreateTenantPayload): Promise<TenantSummary> {
    const res = await api.post<{ data: TenantSummary }>('/superadmin/tenants', payload);
    return res.data.data;
  }

  async deleteTenant(id: string): Promise<void> {
    await api.delete(`/superadmin/tenants/${id}`);
  }

  async resetPassword(tenantId: string, newPassword: string): Promise<void> {
    await api.post(`/superadmin/tenants/${tenantId}/reset-password`, { newPassword });
  }
}

export const superAdminService = new SuperAdminService();
export default superAdminService;
