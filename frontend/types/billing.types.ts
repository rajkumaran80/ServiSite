export type TenantStatus = 'TRIAL' | 'GRACE' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type BillingPlan = 'basic' | 'ordering';

export interface BillingStatus {
  tenantId: string;
  status: TenantStatus;
  plan: BillingPlan | null;
  registrationFeePaid: boolean;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  stripeSubscriptionId: string | null;
  stripeConnectId: string | null;
  currentPeriodEnd: string | null;
  suspendedAt: string | null;
  hasSubscription: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT';
  required: boolean;
  minSelect: number;
  maxSelect: number;
  freeLimit: number;
  sortOrder: number;
  options: ModifierOption[];
}

export interface MenuItemModifierAssignment {
  modifierGroupId: string;
  sortOrder?: number;
}

export interface CreateModifierGroupPayload {
  name: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT';
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  freeLimit?: number;
  sortOrder?: number;
}

export interface CreateModifierOptionPayload {
  name: string;
  priceAdjustment?: number;
  isDefault?: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
}
