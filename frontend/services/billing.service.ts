import { apiGet, apiPost, apiDelete, apiPut } from './api';
import type {
  BillingStatus,
  BillingPlan,
  ModifierGroup,
  CreateModifierGroupPayload,
  CreateModifierOptionPayload,
  ModifierOption,
  MenuItemModifierAssignment,
} from '../types/billing.types';

// ── Billing ─────────────────────────────────────────────────────────────────

export const getBillingStatus = (): Promise<BillingStatus> =>
  apiGet<BillingStatus>('/billing/status');

export const getRegistrationCheckoutUrl = (): Promise<{ url: string }> =>
  apiPost<{ url: string }>('/billing/checkout/registration');

export const getSubscriptionCheckoutUrl = (plan: BillingPlan): Promise<{ url: string }> =>
  apiPost<{ url: string }>('/billing/checkout/subscription', { plan });

export const getPortalUrl = (): Promise<{ url: string }> =>
  apiPost<{ url: string }>('/billing/portal');

export const getConnectOnboardingUrl = (): Promise<{ url: string }> =>
  apiPost<{ url: string }>('/billing/connect/onboard');

export const changePlan = (plan: 'basic' | 'ordering'): Promise<void> =>
  apiPost('/billing/subscription/change-plan', { plan });

export const getVapidPublicKey = (): Promise<{ key: string }> =>
  apiGet<{ key: string }>('/billing/push/vapid-public-key');

export const subscribePush = (endpoint: string, p256dh: string, auth: string): Promise<void> =>
  apiPost('/billing/push/subscribe', { endpoint, p256dh, auth });

export const unsubscribePush = (endpoint: string): Promise<void> =>
  apiPost('/billing/push/unsubscribe', { endpoint });

// ── Modifiers ────────────────────────────────────────────────────────────────

export const getModifierGroups = (): Promise<ModifierGroup[]> =>
  apiGet<ModifierGroup[]>('/modifiers/groups');

export const createModifierGroup = (data: CreateModifierGroupPayload): Promise<ModifierGroup> =>
  apiPost<ModifierGroup>('/modifiers/groups', data);

export const updateModifierGroup = (
  id: string,
  data: Partial<CreateModifierGroupPayload>,
): Promise<ModifierGroup> => apiPut<ModifierGroup>(`/modifiers/groups/${id}`, data);

export const deleteModifierGroup = (id: string): Promise<void> =>
  apiDelete(`/modifiers/groups/${id}`);

export const addModifierOption = (
  groupId: string,
  data: CreateModifierOptionPayload,
): Promise<ModifierOption> => apiPost<ModifierOption>(`/modifiers/groups/${groupId}/options`, data);

export const updateModifierOption = (
  optionId: string,
  data: Partial<CreateModifierOptionPayload>,
): Promise<ModifierOption> => apiPut<ModifierOption>(`/modifiers/options/${optionId}`, data);

export const deleteModifierOption = (groupId: string, optionId: string): Promise<void> =>
  apiDelete(`/modifiers/groups/${groupId}/options/${optionId}`);

export const assignModifiersToItem = (
  menuItemId: string,
  groups: MenuItemModifierAssignment[],
): Promise<void> => apiPut(`/modifiers/menu-item/${menuItemId}`, { groups });
