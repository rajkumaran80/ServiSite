import { create } from 'zustand';

export interface SelectedModifier {
  modifierGroupId: string;
  optionIds: string[];
}

export interface CartLine {
  cartKey: string; // unique key: `${menuItemId}-${hash(modifiers)}`
  menuItemId: string;
  type: 'item' | 'bundle';
  name: string;
  basePrice: number;
  modifierAdjustment: number; // sum of selected option priceAdjustments
  unitPrice: number; // basePrice + modifierAdjustment
  quantity: number;
  imageUrl?: string | null;
  notes?: string;
  selectedModifiers: SelectedModifier[];
  modifierSummary: string; // e.g. "Large, Extra Cheese"
}

interface CartStore {
  tenantSlug: string | null;
  lines: CartLine[];
  isOpen: boolean;

  setTenant: (slug: string) => void;
  addItem: (item: Omit<CartLine, 'quantity'>) => void;
  removeItem: (cartKey: string) => void;
  updateQty: (cartKey: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  tenantSlug: null,
  lines: [],
  isOpen: false,

  setTenant: (slug) => {
    if (get().tenantSlug && get().tenantSlug !== slug) {
      set({ tenantSlug: slug, lines: [], isOpen: false });
    } else {
      set({ tenantSlug: slug });
    }
  },

  addItem: (item) =>
    set((state) => {
      const existing = state.lines.find((l) => l.cartKey === item.cartKey);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.cartKey === item.cartKey ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return { lines: [...state.lines, { ...item, quantity: 1 }] };
    }),

  removeItem: (cartKey) =>
    set((state) => ({ lines: state.lines.filter((l) => l.cartKey !== cartKey) })),

  updateQty: (cartKey, qty) => {
    if (qty <= 0) {
      get().removeItem(cartKey);
      return;
    }
    set((state) => ({
      lines: state.lines.map((l) => (l.cartKey === cartKey ? { ...l, quantity: qty } : l)),
    }));
  },

  clearCart: () => set({ lines: [] }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),

  totalItems: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
}));

/** Build a stable cartKey from itemId + selected modifiers */
export function buildCartKey(
  menuItemId: string,
  selectedModifiers: SelectedModifier[],
): string {
  if (!selectedModifiers.length) return menuItemId;
  const sorted = [...selectedModifiers]
    .sort((a, b) => a.modifierGroupId.localeCompare(b.modifierGroupId))
    .map((m) => `${m.modifierGroupId}:${[...m.optionIds].sort().join(',')}`)
    .join('|');
  return `${menuItemId}-${sorted}`;
}
