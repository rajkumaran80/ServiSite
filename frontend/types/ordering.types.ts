export type BundlePricingType = 'FIXED' | 'SUM' | 'DISCOUNTED';
export type PricingRuleType = 'BOGO' | 'PERCENTAGE' | 'FIXED_AMOUNT' | 'HAPPY_HOUR';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ChoiceGroupSource {
  id: string;
  sourceType: 'MENU_GROUP' | 'CATEGORY' | 'ITEM';
  sourceId: string;
}

export interface ChoiceGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  sortOrder: number;
  sources: ChoiceGroupSource[];
}

export interface BundleChoiceGroup {
  id: string;
  choiceGroupId: string;
  sortOrder: number;
  choiceGroup?: ChoiceGroup;
}

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pricingType: BundlePricingType;
  basePrice: string | number | null;
  discountPct: string | number | null;
  isActive: boolean;
  sortOrder: number;
  choiceGroups: BundleChoiceGroup[];
}

export interface PricingRule {
  id: string;
  name: string;
  type: PricingRuleType;
  condition: Record<string, any>;
  action: Record<string, any>;
  priority: number;
  stackable: boolean;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
}

export interface OrderLine {
  id: string;
  menuItemId: string | null;
  bundleId: string | null;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  notes: string | null;
  selections: any;
  menuItem?: { id: string; name: string };
  bundle?: { id: string; name: string };
}

export interface Order {
  id: string;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  tableNumber: string | null;
  notes: string | null;
  subtotal: string | number;
  discountAmt: string | number;
  total: string | number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  lines: OrderLine[];
}

// ── Cart types ──────────────────────────────────────────────────────────────

export interface CartLine {
  id: string; // menuItemId or bundleId
  type: 'item' | 'bundle';
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface AppliedDiscount {
  ruleName: string;
  discountAmt: number;
}

export interface ComputedCartLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  type: 'item' | 'bundle';
}

export interface ComputedCart {
  lines: ComputedCartLine[];
  appliedDiscounts: AppliedDiscount[];
  subtotal: number;
  discountAmt: number;
  total: number;
  currency: string;
}

// ── Payloads ────────────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tableNumber?: string;
  notes?: string;
  lines: Array<{
    menuItemId?: string;
    bundleId?: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ modifierGroupId: string; optionIds: string[] }>;
  }>;
}

export interface CreateChoiceGroupPayload {
  name: string;
  minSelection?: number;
  maxSelection?: number;
  sortOrder?: number;
  sources?: Array<{ sourceType: 'MENU_GROUP' | 'CATEGORY' | 'ITEM'; sourceId: string }>;
}

export interface CreateBundlePayload {
  name: string;
  description?: string;
  imageUrl?: string;
  pricingType: BundlePricingType;
  basePrice?: number;
  discountPct?: number;
  isActive?: boolean;
  sortOrder?: number;
  choiceGroups?: Array<{ choiceGroupId: string; sortOrder?: number }>;
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
