import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
  Bundle,
  ChoiceGroup,
  PricingRule,
  Order,
  ComputedCart,
  PlaceOrderPayload,
  CreateChoiceGroupPayload,
  CreateBundlePayload,
  CreatePricingRulePayload,
} from '../types/ordering.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Public methods use direct fetch (no auth, but need X-Tenant-ID)
async function publicFetch<T>(tenantSlug: string, path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantSlug,
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data;
}

const orderingService = {
  // ── Public ──────────────────────────────────────────────────────────────

  getBundles(tenantSlug: string): Promise<Bundle[]> {
    return publicFetch<Bundle[]>(tenantSlug, '/ordering/bundles');
  },

  computeCart(
    tenantSlug: string,
    lines: Array<{ menuItemId?: string; bundleId?: string; quantity: number }>,
  ): Promise<ComputedCart> {
    return publicFetch<ComputedCart>(tenantSlug, '/ordering/cart/compute', {
      method: 'POST',
      body: JSON.stringify({ lines }),
    });
  },

  placeOrder(tenantSlug: string, payload: PlaceOrderPayload): Promise<Order> {
    return publicFetch<Order>(tenantSlug, '/ordering/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── Admin — Choice Groups ────────────────────────────────────────────────

  getChoiceGroups(): Promise<ChoiceGroup[]> {
    return apiGet<ChoiceGroup[]>('/ordering/choice-groups');
  },
  createChoiceGroup(data: CreateChoiceGroupPayload): Promise<ChoiceGroup> {
    return apiPost<ChoiceGroup>('/ordering/choice-groups', data);
  },
  updateChoiceGroup(id: string, data: Partial<CreateChoiceGroupPayload>): Promise<ChoiceGroup> {
    return apiPut<ChoiceGroup>(`/ordering/choice-groups/${id}`, data);
  },
  deleteChoiceGroup(id: string): Promise<void> {
    return apiDelete(`/ordering/choice-groups/${id}`);
  },

  // ── Admin — Bundles ──────────────────────────────────────────────────────

  getBundlesAdmin(): Promise<Bundle[]> {
    return apiGet<Bundle[]>('/ordering/bundles');
  },
  createBundle(data: CreateBundlePayload): Promise<Bundle> {
    return apiPost<Bundle>('/ordering/bundles', data);
  },
  updateBundle(id: string, data: Partial<CreateBundlePayload>): Promise<Bundle> {
    return apiPut<Bundle>(`/ordering/bundles/${id}`, data);
  },
  deleteBundle(id: string): Promise<void> {
    return apiDelete(`/ordering/bundles/${id}`);
  },

  // ── Admin — Pricing Rules ────────────────────────────────────────────────

  getPricingRules(): Promise<PricingRule[]> {
    return apiGet<PricingRule[]>('/ordering/pricing-rules');
  },
  createPricingRule(data: CreatePricingRulePayload): Promise<PricingRule> {
    return apiPost<PricingRule>('/ordering/pricing-rules', data);
  },
  updatePricingRule(id: string, data: Partial<CreatePricingRulePayload>): Promise<PricingRule> {
    return apiPut<PricingRule>(`/ordering/pricing-rules/${id}`, data);
  },
  deletePricingRule(id: string): Promise<void> {
    return apiDelete(`/ordering/pricing-rules/${id}`);
  },

  // ── Admin — Orders ───────────────────────────────────────────────────────

  getOrders(status?: string): Promise<Order[]> {
    const url = status ? `/ordering/orders?status=${status}` : '/ordering/orders';
    return apiGet<Order[]>(url);
  },
  getOrder(id: string): Promise<Order> {
    return apiGet<Order>(`/ordering/orders/${id}`);
  },
  updateOrderStatus(id: string, status: string): Promise<Order> {
    return apiPut<Order>(`/ordering/orders/${id}/status`, { status });
  },
};

export default orderingService;
