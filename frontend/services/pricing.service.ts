import { api } from './api';

export type PricingRuleType = 'BOGO' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'HAPPY_HOUR';

export interface PricingRule {
  id: string;
  tenantId: string;
  name: string;
  type: PricingRuleType;
  condition: Record<string, any>;
  action: Record<string, any>;
  priority: number;
  stackable: boolean;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingRulePayload {
  name: string;
  type: PricingRuleType;
  condition: Record<string, any>;
  action: Record<string, any>;
  priority?: number;
  stackable?: boolean;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}

class PricingService {
  async listRules(): Promise<PricingRule[]> {
    const res = await api.get<{ data: PricingRule[] }>('/pricing/rules');
    return res.data.data;
  }

  async createRule(payload: CreatePricingRulePayload): Promise<PricingRule> {
    const res = await api.post<{ data: PricingRule }>('/pricing/rules', payload);
    return res.data.data;
  }

  async updateRule(id: string, payload: Partial<CreatePricingRulePayload>): Promise<PricingRule> {
    const res = await api.put<{ data: PricingRule }>(`/pricing/rules/${id}`, payload);
    return res.data.data;
  }

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/pricing/rules/${id}`);
  }
}

export const pricingService = new PricingService();
export default pricingService;
