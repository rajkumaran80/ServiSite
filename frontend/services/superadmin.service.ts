import { api } from './api';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  type: string;
  currency: string;
  status: string;
  plan: string;
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

  async setTenantStatus(tenantId: string, status: string): Promise<void> {
    await api.post(`/superadmin/tenants/${tenantId}/status`, { status });
  }

  async applyTemplate(tenantId: string, clearExisting = false): Promise<void> {
    await api.post(`/superadmin/tenants/${tenantId}/apply-template`, { clearExisting });
  }

  async impersonate(tenantId: string): Promise<{ accessToken: string; refreshToken: string; user: any; tenantSlug: string }> {
    const res = await api.post<{ data: any }>(`/superadmin/tenants/${tenantId}/impersonate`);
    return res.data.data;
  }

  async getPricing(): Promise<{ registrationFee: number; basicMonthly: number; orderingMonthly: number }> {
    const res = await api.get<{ data: any }>('/superadmin/pricing');
    return res.data.data;
  }

  async setPricing(pricing: { registrationFee: number; basicMonthly: number; orderingMonthly: number }): Promise<void> {
    await api.put('/superadmin/pricing', pricing);
  }

  async getTenantPricing(tenantId: string): Promise<{ registrationFee?: number; basicMonthly?: number; orderingMonthly?: number } | null> {
    const res = await api.get<{ data: any }>(`/superadmin/tenants/${tenantId}/pricing`);
    return res.data.data;
  }

  async setTenantPricing(tenantId: string, pricing: { registrationFee?: number; basicMonthly?: number; orderingMonthly?: number } | null): Promise<void> {
    await api.put(`/superadmin/tenants/${tenantId}/pricing`, pricing ?? {});
  }

  async changeAdminEmail(tenantId: string, newEmail: string): Promise<void> {
    await api.post(`/superadmin/tenants/${tenantId}/change-email`, { newEmail });
  }

  async changeTenantPlan(tenantId: string, plan: 'BASIC' | 'ORDERING'): Promise<void> {
    await api.post(`/superadmin/tenants/${tenantId}/change-plan`, { plan });
  }
}

export const superAdminService = new SuperAdminService();
export default superAdminService;
