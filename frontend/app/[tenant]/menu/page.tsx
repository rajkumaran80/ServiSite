'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import type { FullMenu, MenuItem } from '../../../types/menu.types';
import { useCartStore, buildCartKey } from '../../../store/cart.store';
import type { SelectedModifier } from '../../../store/cart.store';
import orderingService from '../../../services/ordering.service';
import type { ComputedCart, PlaceOrderPayload } from '../../../types/ordering.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch { return null; }
}

async function getFullMenu(slug: string): Promise<FullMenu> {
  try {
    const res = await fetch(`${API_URL}/menu/full`, {
      next: { revalidate: 60 },
      headers: { 'X-Tenant-ID': slug },
    } as RequestInit);
    if (!res.ok) return { groups: [], uncategorized: [] };
    const data = await res.json();
    return data.data;
  } catch { return { groups: [], uncategorized: [] }; }
}

async function getPublicBundles(slug: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_URL}/bundles`, {
      cache: 'no-store',
      headers: { 'X-Tenant-ID': slug },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch { return []; }
}

function resolveSlotItems(sources: { sourceType: string; sourceId: string }[], menu: FullMenu): MenuItem[] {
  const items: MenuItem[] = [];
  const seen = new Set<string>();

  const add = (item: MenuItem) => {
    if (item.isAvailable && !seen.has(item.id)) {
      items.push(item);
      seen.add(item.id);
    }
  };

  for (const src of sources) {
    if (src.sourceType === 'ITEM') {
      for (const g of menu.groups) for (const c of g.categories ?? []) for (const i of c.menuItems ?? []) if (i.id === src.sourceId) add(i);
      for (const i of menu.uncategorized) if (i.id === src.sourceId) add(i);
    } else if (src.sourceType === 'CATEGORY') {
      for (const g of menu.groups) for (const c of g.categories ?? []) if (c.id === src.sourceId) for (const i of c.menuItems ?? []) add(i);
    } else if (src.sourceType === 'MENU_GROUP') {
      for (const g of menu.groups) if (g.id === src.sourceId) for (const c of g.categories ?? []) for (const i of c.menuItems ?? []) add(i);
    }
  }
  return items;
}

function calculateBundlePrice(bundle: any, selections: Record<string, MenuItem[]>): number {
  if (bundle.pricingType === 'FIXED') return parseFloat(bundle.basePrice) || 0;
  const sum = Object.values(selections).flat().reduce((total, item) => {
    return total + (typeof item.price === 'string' ? parseFloat(item.price) : (item.price as number));
  }, 0);
  if (bundle.pricingType === 'DISCOUNTED') return sum * (1 - (parseFloat(bundle.discountPct) || 0) / 100);
  return sum;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${suffix}`;
}

function formatPrice(price: number | string, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(typeof price === 'string' ? parseFloat(price) : price);
}

// ─── Cart Drawer ───────────────────────────────────────────────────────────────

function CartDrawer({
  tenantSlug,
  currency,
  onCheckout,
}: {
  tenantSlug: string;
  currency: string;
  onCheckout: () => void;
}) {
  const { lines, isOpen, closeCart, removeItem, updateQty } = useCartStore();
  const [computed, setComputed] = useState<ComputedCart | null>(null);
  const [computing, setComputing] = useState(false);

  // Recompute cart whenever lines change (debounced)
  useEffect(() => {
    if (lines.length === 0) { setComputed(null); return; }
    const id = setTimeout(async () => {
      setComputing(true);
      try {
        const result = await orderingService.computeCart(
          tenantSlug,
          lines.map((l) => ({
            menuItemId: l.type === 'item' ? l.menuItemId : undefined,
            bundleId: l.type === 'bundle' ? l.menuItemId : undefined,
            quantity: l.quantity,
          })),
        );
        setComputed(result);
      } catch {
        // fallback: compute locally
        const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
        setComputed({ lines: [], appliedDiscounts: [], subtotal, discountAmt: 0, total: subtotal, currency });
      } finally {
        setComputing(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [lines, tenantSlug, currency]);

  const subtotal = computed?.subtotal ?? lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discountAmt = computed?.discountAmt ?? 0;
  const total = computed?.total ?? subtotal;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeCart} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Your Order</h2>
          <button onClick={closeCart} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {lines.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-gray-500 text-sm">Your cart is empty</p>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.cartKey} className="flex items-center gap-3">
                {line.imageUrl ? (
                  <img src={line.imageUrl} alt={line.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{line.name}</p>
                  {line.modifierSummary && (
                    <p className="text-xs text-gray-400 truncate">{line.modifierSummary}</p>
                  )}
                  <p className="text-sm text-blue-700 font-semibold">{formatPrice(line.unitPrice, currency)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateQty(line.cartKey, line.quantity - 1)}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-medium text-gray-900">{line.quantity}</span>
                  <button
                    onClick={() => updateQty(line.cartKey, line.quantity + 1)}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(line.cartKey)}
                    className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary + checkout */}
        {lines.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            {computing && (
              <p className="text-xs text-gray-400 text-center">Calculating discounts…</p>
            )}

            {/* Discounts */}
            {(computed?.appliedDiscounts ?? []).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm text-green-700">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🏷️</span>
                  {d.ruleName}
                </span>
                <span>−{formatPrice(d.discountAmt, currency)}</span>
              </div>
            ))}

            {discountAmt > 0 && (
              <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>

            <button
              onClick={onCheckout}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Place Order
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Checkout Modal ────────────────────────────────────────────────────────────

function CheckoutModal({
  tenantSlug,
  currency,
  onClose,
  onSuccess,
}: {
  tenantSlug: string;
  currency: string;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const { lines, clearCart } = useCartStore();
  const [form, setForm] = useState({ name: '', email: '', phone: '', table: '', notes: '' });
  const [placing, setPlacing] = useState(false);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter your name'); return; }
    setPlacing(true);
    try {
      const payload: PlaceOrderPayload = {
        customerName: form.name.trim(),
        customerEmail: form.email.trim() || undefined,
        customerPhone: form.phone.trim() || undefined,
        tableNumber: form.table.trim() || undefined,
        notes: form.notes.trim() || undefined,
        lines: lines.map((l) => ({
          menuItemId: l.type === 'item' ? l.menuItemId : undefined,
          bundleId: l.type === 'bundle' ? l.menuItemId : undefined,
          quantity: l.quantity,
          modifiers: l.selectedModifiers.length ? l.selectedModifiers : undefined,
        })),
      };
      const order = await orderingService.placeOrder(tenantSlug, payload);
      clearCart();
      onSuccess(order.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxWidth: '440px', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Place Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Order summary */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              {lines.map((l) => (
                <div key={l.cartKey} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{l.quantity}× {l.name}{l.modifierSummary ? ` (${l.modifierSummary})` : ''}</span>
                  <span className="text-gray-900 font-medium">{formatPrice(l.unitPrice * l.quantity, currency)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
                <span>Approx. Total</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input
                  autoFocus
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+44 7700 900000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table Number (optional)</label>
                <input
                  className={inputCls}
                  value={form.table}
                  onChange={(e) => set('table', e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Allergies, special requests…"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={placing} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                Back
              </button>
              <button type="submit" disabled={placing} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {placing ? 'Placing order…' : 'Confirm Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Order Success Modal ───────────────────────────────────────────────────────

function OrderSuccessModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order Placed!</h2>
        <p className="text-gray-600 text-sm mb-1">Your order has been received.</p>
        <p className="text-xs text-gray-400 mb-6 font-mono">Ref: #{orderId.slice(-8).toUpperCase()}</p>
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Modifier Picker Modal ─────────────────────────────────────────────────────

function ModifierPickerModal({
  item,
  currency,
  onClose,
  onConfirm,
}: {
  item: MenuItem;
  currency: string;
  onClose: () => void;
  onConfirm: (modifiers: SelectedModifier[], totalAdjustment: number, summary: string) => void;
}) {
  const groups: any[] = (item as any).modifierGroups ?? [];
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    groups.forEach((g: any) => {
      const defaults = g.options.filter((o: any) => o.isDefault).map((o: any) => o.id);
      init[g.id] = defaults;
    });
    return init;
  });

  const toggle = (groupId: string, optionId: string, isSingle: boolean) => {
    setSelections((prev) => {
      const cur = prev[groupId] ?? [];
      if (isSingle) return { ...prev, [groupId]: [optionId] };
      if (cur.includes(optionId)) return { ...prev, [groupId]: cur.filter((x) => x !== optionId) };
      return { ...prev, [groupId]: [...cur, optionId] };
    });
  };

  const handleConfirm = () => {
    // Validate required groups
    for (const g of groups) {
      if (g.required && (!selections[g.id] || selections[g.id].length === 0)) {
        toast.error(`Please select an option for "${g.name}"`);
        return;
      }
      if (g.minSelect > 0 && (selections[g.id] ?? []).length < g.minSelect) {
        toast.error(`Please select at least ${g.minSelect} option(s) for "${g.name}"`);
        return;
      }
    }

    // Build result
    const selectedModifiers: SelectedModifier[] = [];
    let totalAdj = 0;
    const summaryParts: string[] = [];

    groups.forEach((g: any) => {
      const chosen = selections[g.id] ?? [];
      if (chosen.length > 0) {
        selectedModifiers.push({ modifierGroupId: g.id, optionIds: chosen });
        chosen.forEach((oid) => {
          const opt = g.options.find((o: any) => o.id === oid);
          if (opt) {
            totalAdj += opt.priceAdjustment;
            summaryParts.push(opt.name);
          }
        });
      }
    });

    onConfirm(selectedModifiers, totalAdj, summaryParts.join(', '));
  };

  const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  const currentAdj = groups.reduce((sum: number, g: any) => {
    return sum + (selections[g.id] ?? []).reduce((s2: number, oid: string) => {
      const opt = g.options.find((o: any) => o.id === oid);
      return s2 + (opt?.priceAdjustment ?? 0);
    }, 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full rounded-2xl shadow-2xl flex flex-col" style={{ maxWidth: '440px', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{item.name}</h2>
            <p className="text-sm text-blue-700 font-semibold">{formatPrice(basePrice + currentAdj, currency)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">
          {groups.map((g: any) => (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{g.name}</h3>
                {g.required && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Required</span>}
                {g.type === 'MULTI_SELECT' && g.maxSelect > 1 && (
                  <span className="text-xs text-gray-400">Choose up to {g.maxSelect}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {g.options.map((opt: any) => {
                  const checked = (selections[g.id] ?? []).includes(opt.id);
                  const isSingle = g.type === 'SINGLE_SELECT';
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggle(g.id, opt.id, isSingle)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                        checked
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-${isSingle ? 'full' : 'sm'} border-2 flex items-center justify-center flex-shrink-0 ${
                          checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {checked && <span className="w-2 h-2 bg-white rounded-full block" />}
                        </span>
                        {opt.name}
                      </span>
                      {opt.priceAdjustment !== 0 && (
                        <span className={opt.priceAdjustment > 0 ? 'text-gray-500' : 'text-green-600'}>
                          {opt.priceAdjustment > 0 ? `+${formatPrice(opt.priceAdjustment, currency)}` : `-${formatPrice(Math.abs(opt.priceAdjustment), currency)}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0">
          <button
            onClick={handleConfirm}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Add to Order — {formatPrice(basePrice + currentAdj, currency)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Detail Modal ─────────────────────────────────────────────────────────

function ItemModal({
  item,
  currency,
  onClose,
  onAddToCart,
  orderingEnabled,
}: {
  item: MenuItem;
  currency: string;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
  orderingEnabled: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const marketingBadge = item.isChefSpecial
    ? { bg: '#FFD700', icon: (
        <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6H8.3A7 7 0 0 1 5 9a7 7 0 0 1 7-7zm-1 15h2v2h-2v-2zm-2 3h6v1H9v-1z"/>
        </svg>
      ), label: "Chef's Special" }
    : item.isNew
    ? { bg: '#007AFF', icon: (
        <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/>
        </svg>
      ), label: 'New' }
    : item.isPopular
    ? { bg: '#FF9500', icon: (
        <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
        </svg>
      ), label: 'Popular' }
    : null;

  const modalTraits = [
    item.isSpicy        && { key: 'spicy', label: 'Spicy',       icon: '🌶️' },
    item.isVegan        && { key: 'vegan', label: 'Vegan',       icon: '🌿' },
    !item.isVegan && item.isVegetarian && { key: 'veg', label: 'Vegetarian', icon: '🥦' },
    item.isGlutenFree   && { key: 'gf',   label: 'Gluten-Free', icon: '🌾' },
  ].filter(Boolean) as { key: string; label: string; icon: string }[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 'min(560px, 95vw)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full object-cover" style={{ maxHeight: '65vh' }} />
          ) : (
            <div className="w-full bg-gray-100 flex items-center justify-center text-7xl" style={{ height: '300px' }}>🍽️</div>
          )}

          {/* Top-left: marketing badge */}
          {marketingBadge && (
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-md"
              style={{ backgroundColor: marketingBadge.bg }}
            >
              {marketingBadge.icon}
              <span>{marketingBadge.label}</span>
            </div>
          )}

          {/* Top-right: close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors text-lg leading-none"
          >
            ×
          </button>

          {/* Bottom-right: trait icons stacked vertically */}
          {modalTraits.length > 0 && (
            <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5">
              {modalTraits.map((t) => (
                <div
                  key={t.key}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-md"
                  style={{ background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                >
                  <span style={{ fontSize: '13px', lineHeight: 1 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900 leading-snug">{item.name}</h2>
            <span className="text-base font-bold text-blue-700 flex-shrink-0">
              {formatPrice(item.price, currency)}
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
          )}

          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.allergens.map((allergen) => (
                <span key={allergen} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                  {allergen}
                </span>
              ))}
            </div>
          )}

          {!item.isAvailable && (
            <p className="text-xs text-red-500 font-medium">Currently unavailable</p>
          )}

          {orderingEnabled && item.isAvailable && (
            <button
              onClick={() => { onAddToCart(item); onClose(); }}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              Add to Order — {formatPrice(item.price, currency)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Item Row (compact list view) ─────────────────────────────────────────────

function ItemRow({
  item,
  currency,
  onClick,
  onAdd,
  orderingEnabled,
  highlight,
  primaryColor,
}: {
  item: MenuItem;
  currency: string;
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
  orderingEnabled: boolean;
  highlight?: boolean;
  primaryColor: string;
}) {
  return (
    <div
      id={`item-${item.id}`}
      className={`flex items-center justify-between gap-3 py-3 px-1 border-b border-gray-100 last:border-0 ${
        highlight ? 'bg-amber-50' : ''
      }`}
    >
      <button type="button" onClick={onClick} className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">{item.name}</span>
          {item.isPopular && (
            <span className="flex-shrink-0 bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">Popular</span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{item.description}</p>
        )}
      </button>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-bold" style={{ color: primaryColor }}>{formatPrice(item.price, currency)}</span>
        {orderingEnabled && item.isAvailable && (
          <button
            onClick={onAdd}
            className="w-7 h-7 rounded-full border flex items-center justify-center text-lg leading-none transition-colors hover:text-white"
            style={{ borderColor: primaryColor, color: primaryColor }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; (e.currentTarget as HTMLButtonElement).style.color = primaryColor; }}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  currency,
  onClick,
  onAdd,
  orderingEnabled,
  highlight,
  cardRadius,
}: {
  item: MenuItem;
  currency: string;
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
  orderingEnabled: boolean;
  highlight?: boolean;
  cardRadius?: string;
}) {
  const [traitsExpanded, setTraitsExpanded] = useState(false);
  const isSoldOut = item.stock === 0 || !item.isAvailable;

  // Top-left badge: priority Chef's Special > New > Popular
  const marketingBadge = item.isChefSpecial
    ? { bg: '#FFD700', icon: (
        <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6H8.3A7 7 0 0 1 5 9a7 7 0 0 1 7-7zm-1 15h2v2h-2v-2zm-2 3h6v1H9v-1z"/>
        </svg>
      ), label: "Chef's Special" }
    : item.isNew
    ? { bg: '#007AFF', icon: (
        <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/>
        </svg>
      ), label: 'New' }
    : item.isPopular
    ? { bg: '#FF9500', icon: (
        <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
        </svg>
      ), label: 'Popular' }
    : null;

  // Top-right trait indicators
  const traits = [
    item.isSpicy        && { key: 'spicy', label: 'Spicy',       icon: '🌶️' },
    item.isVegan        && { key: 'vegan', label: 'Vegan',       icon: '🌿' },
    !item.isVegan && item.isVegetarian && { key: 'veg', label: 'Vegetarian', icon: '🥦' },
    item.isGlutenFree   && { key: 'gf',   label: 'Gluten-Free', icon: '🌾' },
  ].filter(Boolean) as { key: string; label: string; icon: string }[];

  const radius = cardRadius || '12px';

  return (
    <div
      id={`item-${item.id}`}
      className={`group bg-white shadow-sm border overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all ${
        highlight ? 'border-amber-400 ring-2 ring-amber-400 ring-offset-1' : 'border-gray-100'
      }`}
      style={{ borderRadius: radius }}
    >
      <button type="button" onClick={onClick} className="text-left flex-1 flex flex-col">
        {/* Image area */}
        <div className="relative overflow-hidden" style={{ borderRadius: `${radius} ${radius} 0 0` }}>
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className={`w-full h-44 object-cover transition-all duration-300 ${
                isSoldOut ? 'grayscale brightness-70' : 'group-hover:scale-105'
              }`}
              style={isSoldOut ? { filter: 'grayscale(100%) brightness(70%)' } : undefined}
            />
          ) : (
            <div className={`w-full h-44 bg-gray-100 flex items-center justify-center text-4xl ${isSoldOut ? 'opacity-40' : ''}`}>
              🍽️
            </div>
          )}

          {/* SOLD OUT overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-black text-lg tracking-widest drop-shadow-lg select-none">SOLD OUT</span>
            </div>
          )}

          {/* Top-left: single marketing badge */}
          {!isSoldOut && marketingBadge && (
            <div
              className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: marketingBadge.bg }}
              title={marketingBadge.label}
            >
              {marketingBadge.icon}
            </div>
          )}

          {/* Top-right: trait indicators with glass effect */}
          {!isSoldOut && traits.length > 0 && (
            <div
              className="absolute top-2 right-2 flex items-center gap-1 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setTraitsExpanded(v => !v); }}
              title="Dietary info"
            >
              {traits.map((t) => (
                <div
                  key={t.key}
                  className="flex items-center gap-1 rounded-full px-1.5 py-1 text-sm transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                >
                  <span className="leading-none" style={{ fontSize: '14px' }}>{t.icon}</span>
                  {traitsExpanded && (
                    <span className="text-[11px] font-semibold text-white drop-shadow whitespace-nowrap pr-0.5">{t.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-gray-900 leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-700 mt-1 line-clamp-2 flex-1">{item.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-base font-bold" style={{ color: isSoldOut ? '#9CA3AF' : undefined }}>
              {formatPrice(item.price, currency)}
            </span>
            {item.allergens && item.allergens.length > 0 && (
              <span className="text-xs text-gray-400">{item.allergens.length} allergen{item.allergens.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </button>

      {/* Add to cart */}
      {orderingEnabled && !isSoldOut && (
        <button
          onClick={onAdd}
          className="mx-4 mb-4 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
        >
          + Add to Order
        </button>
      )}
    </div>
  );
}

// ─── Bundle Card ──────────────────────────────────────────────────────────────

function BundleCard({
  bundle,
  currency,
  primaryColor,
  onClick,
}: {
  bundle: any;
  currency: string;
  primaryColor: string;
  onClick: () => void;
}) {
  const displayPrice =
    bundle.pricingType === 'FIXED' && bundle.basePrice != null
      ? formatPrice(parseFloat(bundle.basePrice), currency)
      : bundle.pricingType === 'DISCOUNTED' && bundle.discountPct != null
      ? `${bundle.discountPct}% off`
      : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {bundle.imageUrl ? (
        <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-44 object-cover" />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-5xl">🎁</div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 leading-snug">{bundle.name}</h3>
        {bundle.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{bundle.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          {displayPrice && <span className="text-base font-bold text-blue-700">{displayPrice}</span>}
          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Deal</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="mt-3 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium rounded-lg transition-colors"
        >
          Customise Deal
        </button>
      </div>
    </div>
  );
}

// ─── Bundle Picker Modal ───────────────────────────────────────────────────────

function BundlePickerModal({
  bundle,
  menu,
  currency,
  onClose,
  onConfirm,
}: {
  bundle: any;
  menu: FullMenu;
  currency: string;
  onClose: () => void;
  onConfirm: (selections: Record<string, MenuItem[]>, price: number) => void;
}) {
  const [selections, setSelections] = useState<Record<string, MenuItem[]>>({});

  const isValid = (bundle.slots ?? []).every((slot: any) => {
    const selected = selections[slot.id] ?? [];
    return selected.length >= (slot.minSelection ?? 1);
  });

  const price = calculateBundlePrice(bundle, selections);

  const toggleItem = (slotId: string, item: MenuItem, maxSel: number) => {
    setSelections((prev) => {
      const current = prev[slotId] ?? [];
      const exists = current.find((i) => i.id === item.id);
      if (exists) return { ...prev, [slotId]: current.filter((i) => i.id !== item.id) };
      if (maxSel === 1) return { ...prev, [slotId]: [item] };
      if (current.length >= maxSel) return prev;
      return { ...prev, [slotId]: [...current, item] };
    });
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">{bundle.name}</h2>
            {bundle.description && <p className="text-sm text-gray-500 mt-0.5">{bundle.description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
          {(bundle.slots ?? []).map((slot: any) => {
            const slotItems = resolveSlotItems(slot.sources ?? [], menu);
            const selected = selections[slot.id] ?? [];
            const minSel = slot.minSelection ?? 1;
            const maxSel = slot.maxSelection ?? 1;
            return (
              <div key={slot.id}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{slot.name}</h3>
                  <span className="text-xs text-gray-400">
                    {minSel === maxSel ? `Choose ${minSel}` : `Choose ${minSel}–${maxSel}`}
                  </span>
                </div>
                {slotItems.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No items available for this slot</p>
                ) : (
                  <div className="space-y-2">
                    {slotItems.map((item) => {
                      const isSelected = selected.some((i) => i.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(slot.id, item, maxSel)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                            {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                          </div>
                          {bundle.pricingType !== 'FIXED' && (
                            <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                              {formatPrice(typeof item.price === 'string' ? parseFloat(item.price) : item.price, currency)}
                            </span>
                          )}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 bg-gray-50">
          <button
            disabled={!isValid}
            onClick={() => onConfirm(selections, price)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors"
          >
            {isValid ? `Add Deal · ${formatPrice(price, currency)}` : 'Make your selections'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Floating Cart Button ──────────────────────────────────────────────────────

function FloatingCartButton({ count, total, currency, onClick }: { count: number; total: number; currency: string; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
      <button
        onClick={onClick}
        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-full shadow-lg shadow-blue-600/30 transition-all hover:shadow-xl hover:shadow-blue-600/40 active:scale-95"
      >
        <div className="relative">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 text-amber-900 text-xs font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? '9+' : count}
          </span>
        </div>
        <span className="text-sm font-semibold">View Order · {formatPrice(total, currency)}</span>
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenant as string;

  const [tenant, setTenant] = useState<any>(null);
  const [menu, setMenu] = useState<FullMenu>({ groups: [], uncategorized: [] });
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);
  const [bundles, setBundles] = useState<any[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dietaryFilters, setDietaryFilters] = useState<Set<string>>(new Set());
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'list'>('grid');

  const cart = useCartStore();

  useEffect(() => {
    if (!tenantSlug) return;
    cart.setTenant(tenantSlug);
    Promise.all([getTenant(tenantSlug), getFullMenu(tenantSlug), getPublicBundles(tenantSlug)]).then(([t, m, b]) => {
      setTenant(t);
      setMenu(m);
      setBundles(b);
      const groupParam = searchParams.get('group');
      const validGroup = groupParam && m.groups.some((g: any) => g.id === groupParam);
      setActiveTab(validGroup ? groupParam : (m.groups[0]?.id ?? ''));
      setLoading(false);
    });
  }, [tenantSlug]);

  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam && menu.groups.some((g: any) => g.id === groupParam)) {
      setActiveTab(groupParam);
    }
  }, [searchParams]);

  // Handle deep-link from URL hash (e.g. /menu#item-{id})
  // Switch to the correct group tab and open the item popup
  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#item-')) return;
    const id = hash.replace('#item-', '');

    // Search all groups → categories → items for this id
    let found: MenuItem | null = null;
    let foundGroupId: string | null = null;
    for (const group of menu.groups) {
      for (const cat of group.categories ?? []) {
        const item = (cat.menuItems ?? []).find((i: MenuItem) => i.id === id);
        if (item) { found = item; foundGroupId = group.id; break; }
      }
      if (found) break;
    }
    // Also check uncategorized
    if (!found) {
      found = menu.uncategorized.find((i) => i.id === id) ?? null;
    }

    if (found) {
      if (foundGroupId) setActiveTab(foundGroupId);
      // Small delay so the tab renders before opening the popup
      setTimeout(() => setSelectedItem(found), 150);
    }
  }, [loading]);

  const toggleDietaryFilter = useCallback((key: string) => {
    setDietaryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSearchQuery('');
    setDietaryFilters(new Set());
  }, []);

  const openItem = useCallback((item: MenuItem) => setSelectedItem(item), []);
  const closeItem = useCallback(() => setSelectedItem(null), []);

  const handleAddToCart = useCallback((item: MenuItem) => {
    const groups: any[] = (item as any).modifierGroups ?? [];
    if (groups.length > 0) {
      // Open modifier picker
      setModifierItem(item);
      return;
    }
    // No modifiers — add directly
    const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    cart.addItem({
      cartKey: buildCartKey(item.id, []),
      menuItemId: item.id,
      type: 'item',
      name: item.name,
      basePrice,
      modifierAdjustment: 0,
      unitPrice: basePrice,
      imageUrl: item.imageUrl,
      selectedModifiers: [],
      modifierSummary: '',
    });
    cart.openCart();
    toast.success(`${item.name} added`, { duration: 1500, position: 'bottom-center' });
  }, [cart]);

  const handleModifierConfirm = useCallback((
    item: MenuItem,
    modifiers: SelectedModifier[],
    totalAdj: number,
    summary: string,
  ) => {
    const basePrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    cart.addItem({
      cartKey: buildCartKey(item.id, modifiers),
      menuItemId: item.id,
      type: 'item',
      name: item.name,
      basePrice,
      modifierAdjustment: totalAdj,
      unitPrice: basePrice + totalAdj,
      imageUrl: item.imageUrl,
      selectedModifiers: modifiers,
      modifierSummary: summary,
    });
    setModifierItem(null);
    cart.openCart();
    toast.success(`${item.name} added`, { duration: 1500, position: 'bottom-center' });
  }, [cart]);

  const handleAddBundle = useCallback((bundle: any, selections: Record<string, MenuItem[]>, price: number) => {
    const selectionSummary = Object.values(selections).flat().map((i) => i.name).join(', ');
    cart.addItem({
      cartKey: `bundle-${bundle.id}`,
      menuItemId: bundle.id,
      type: 'bundle',
      name: bundle.name,
      basePrice: price,
      modifierAdjustment: 0,
      unitPrice: price,
      imageUrl: bundle.imageUrl,
      selectedModifiers: [],
      modifierSummary: selectionSummary,
    });
    setSelectedBundle(null);
    cart.openCart();
    toast.success(`${bundle.name} added`, { duration: 1500, position: 'bottom-center' });
  }, [cart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-3xl px-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">404</div>
          <p className="text-gray-600">Restaurant not found</p>
        </div>
      </div>
    );
  }

  const currency = tenant.currency || 'GBP';
  const isRestaurant = tenant.type === 'RESTAURANT';
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';
  const menuGroupStyle: 'pill' | 'rounded' | 'sharp' = (tenant.themeSettings as any)?.menuGroupStyle || 'pill';
  const cardRadius = (tenant.themeSettings as any)?.designTokens?.radius || '12px';
  const groupTabRadius = menuGroupStyle === 'pill' ? '999px' : menuGroupStyle === 'rounded' ? '10px' : '0px';
  const orderingEnabled = tenant.plan !== 'BASIC';
  const activeSection = menu.groups.find((s) => s.id === activeTab);
  const hasContent =
    menu.groups.some((s) => s.categories?.some((c) => c.menuItems && c.menuItems.length > 0)) ||
    menu.uncategorized.length > 0;

  const cartTotal = cart.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const cartCount = cart.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Banner / Video Header */}
      {(() => {
        const themeSettings = (tenant.themeSettings as any) || {};
        const menuBannerType: string = themeSettings.menuBannerType || 'image';
        const menuVideoUrl: string | null = themeSettings.menuVideoUrl || null;
        const menuBannerImageUrl: string | null = themeSettings.menuBannerImageUrl || null;
        const bannerImages: string[] = Array.isArray(themeSettings.bannerImages) && themeSettings.bannerImages.length > 0
          ? themeSettings.bannerImages
          : tenant.banner ? [tenant.banner] : [];
        // For image type: prefer dedicated menu banner, fall back to site banner
        const heroBgImage = menuBannerType === 'image'
          ? (menuBannerImageUrl || bannerImages[0] || null)
          : (bannerImages[0] || null);

        const overlayStyle = {
          background: `linear-gradient(to bottom, ${primaryColor}cc, rgba(0,0,0,0.55))`,
        };
        const bannerText = (
          <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
            <h1 className="text-4xl font-black mb-2" style={{ color: 'var(--heading-on-dark)' }}>
              {'Our Menu'}
            </h1>
            <p className="text-lg" style={{ color: 'var(--body-on-dark)', opacity: 0.85 }}>{tenant.name}</p>
          </div>
        );

        if (menuBannerType === 'video' && menuVideoUrl) {
          return (
            <div className="relative overflow-hidden" style={{ height: 300 }}>
              <video
                src={menuVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0" style={overlayStyle} />
              {bannerText}
            </div>
          );
        }

        if (heroBgImage) {
          return (
            <div className="relative overflow-hidden" style={{ height: 300 }}>
              <img src={heroBgImage} alt={tenant.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={overlayStyle} />
              {bannerText}
            </div>
          );
        }

        // Fallback gradient header
        return (
          <div
            className="py-16 px-6 text-center"
            style={{ background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}99)` }}
          >
            <div className="text-5xl mb-4">{isRestaurant ? '🍽️' : '🛠️'}</div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--heading-on-dark)' }}>
              {'Our Menu'}
            </h1>
            <p className="text-lg" style={{ color: 'var(--body-on-dark)', opacity: 0.85 }}>{tenant.name}</p>
          </div>
        );
      })()}

      {/* Group Tab Bar + Search */}
      {menu.groups.length > 0 && (
        <div className="fixed top-20 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Tab row — search inline on sm+, hidden on mobile */}
            <div className="flex items-center gap-3 py-2">
              <div className="overflow-x-auto flex-1 scrollbar-none">
                <div className="flex justify-start sm:justify-center gap-1 min-w-max sm:min-w-0 w-max sm:w-full">
                  {menu.groups.map((group) => {
                    const isActive = activeTab === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => handleTabChange(group.id)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-all ${
                          isActive ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{ borderRadius: groupTabRadius, ...(isActive ? { backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}55` } : {}) }}
                      >
                        {group.icon && <span className="text-base leading-none">{group.icon}</span>}
                        {group.name}
                      </button>
                    );
                  })}
                  {menu.uncategorized.length > 0 && (
                    <button
                      onClick={() => handleTabChange('uncategorized')}
                      className={`flex-shrink-0 px-4 py-2 text-sm font-bold transition-all ${
                        activeTab === 'uncategorized' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{ borderRadius: groupTabRadius, ...(activeTab === 'uncategorized' ? { backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}55` } : {}) }}
                    >
                      Other
                    </button>
                  )}
                </div>
              </div>
              {/* Search + view toggle — visible only on sm+ alongside tabs */}
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search…"
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:border-transparent w-48"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* View toggle */}
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white'}`}
                    style={viewMode === 'grid' ? { backgroundColor: primaryColor } : {}}
                    title="Grid view"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`p-1.5 transition-colors ${viewMode === 'compact' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white'}`}
                    style={viewMode === 'compact' ? { backgroundColor: primaryColor } : {}}
                    title="Compact view"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="4" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h11M10 12h11M10 18h11"/>
                      <rect x="3" y="10" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>
                      <rect x="3" y="16" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 transition-colors ${viewMode === 'list' ? 'text-white' : 'text-gray-400 hover:text-gray-600 bg-white'}`}
                    style={viewMode === 'list' ? { backgroundColor: primaryColor } : {}}
                    title="List view"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Search row — mobile only, below tabs */}
            <div className="sm:hidden pb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:border-transparent w-full"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* View toggle — mobile */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'text-white' : 'text-gray-400 bg-white'}`}
                  style={viewMode === 'grid' ? { backgroundColor: primaryColor } : {}}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-2 transition-colors ${viewMode === 'compact' ? 'text-white' : 'text-gray-400 bg-white'}`}
                  style={viewMode === 'compact' ? { backgroundColor: primaryColor } : {}}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6h11M10 12h11M10 18h11"/>
                    <rect x="3" y="10" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>
                    <rect x="3" y="16" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'text-white' : 'text-gray-400 bg-white'}`}
                  style={viewMode === 'list' ? { backgroundColor: primaryColor } : {}}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          {/* Dietary filter pills — shared row for desktop + mobile */}
          {(() => {
            const allItems = [
              ...menu.groups.flatMap(g => (g.categories ?? []).flatMap(c => c.menuItems ?? [])),
              ...menu.uncategorized,
            ];
            const pills = [
              { key: 'vegan',      label: 'Vegan',       icon: '🌿', check: (i: MenuItem) => i.isVegan },
              { key: 'vegetarian', label: 'Vegetarian',  icon: '🥦', check: (i: MenuItem) => i.isVegan || i.isVegetarian },
              { key: 'spicy',      label: 'Spicy',       icon: '🌶️', check: (i: MenuItem) => i.isSpicy },
              { key: 'gf',         label: 'Gluten-Free', icon: '🌾', check: (i: MenuItem) => i.isGlutenFree },
            ].filter(p => allItems.some(p.check));
            if (pills.length === 0) return null;
            return (
              <div className="pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {pills.map((p) => {
                  const active = dietaryFilters.has(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => toggleDietaryFilter(p.key)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        active ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                      style={active ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  );
                })}
                {dietaryFilters.size > 0 && (
                  <button
                    onClick={() => setDietaryFilters(new Set())}
                    className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 underline ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            );
          })()}
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 ${menu.groups.length > 0 ? 'pt-14' : ''}`}>
        {/* Search when no group tab bar */}
        {menu.groups.length === 0 && menu.uncategorized.length > 0 && (
          <div className="mb-6 relative max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items…"
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 w-full"
              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {orderingEnabled && bundles.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide mb-5">Deals</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {bundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  currency={currency}
                  primaryColor={primaryColor}
                  onClick={() => setSelectedBundle(bundle)}
                />
              ))}
            </div>
          </div>
        )}
        {!hasContent ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">{isRestaurant ? '🍽️' : '🛠️'}</div>
            <h2 className="text-xl font-semibold text-gray-700">No items yet</h2>
            <p className="text-gray-500 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div>
            {activeSection && (() => {
              const q = searchQuery.trim().toLowerCase();
              const filterItems = (items: MenuItem[]) => {
                let result = q
                  ? items.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
                  : items;
                if (dietaryFilters.has('vegan'))      result = result.filter(i => i.isVegan);
                if (dietaryFilters.has('vegetarian')) result = result.filter(i => i.isVegan || i.isVegetarian);
                if (dietaryFilters.has('spicy'))      result = result.filter(i => i.isSpicy);
                if (dietaryFilters.has('gf'))         result = result.filter(i => i.isGlutenFree);
                return result;
              };

              // Build filtered categories
              const filteredCats = (activeSection.categories ?? [])
                .map((cat) => ({ ...cat, menuItems: filterItems(cat.menuItems ?? []) }))
                .filter((cat) => cat.menuItems.length > 0);

              const noResults = (q || dietaryFilters.size > 0) && filteredCats.length === 0;

              return (
                <div>
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                      {activeSection.icon && <span className="text-3xl">{activeSection.icon}</span>}
                      <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                        {activeSection.name}
                      </h2>
                    </div>
                    {activeSection.servedFrom && activeSection.servedUntil && (
                      <p className="text-sm text-gray-500 mt-1">
                        Served {formatTime(activeSection.servedFrom)} – {formatTime(activeSection.servedUntil)}
                      </p>
                    )}
                    {activeSection.description && (
                      <p className="text-gray-600 mt-2">{activeSection.description}</p>
                    )}
                    {activeSection.headerText && (
                      <div className="mt-4 px-4 py-3 rounded-xl text-sm text-center italic leading-relaxed" style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}>
                        {activeSection.headerText}
                      </div>
                    )}
                  </div>

                  {noResults ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-gray-500">No items match your filters</p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {filteredCats.map((category) => (
                        <section key={category.id}>
                          <div className="mb-5">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px" style={{ background: `${primaryColor}30` }} />
                              <div className="text-center">
                                <span
                                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                                  style={{ color: primaryColor, background: `${primaryColor}12` }}
                                >
                                  {category.name}
                                </span>
                              </div>
                              <div className="flex-1 h-px" style={{ background: `${primaryColor}30` }} />
                            </div>
                            {category.description && (
                              <p className="text-xs text-gray-500 mt-2 text-center">{category.description}</p>
                            )}
                            {(category as any).headerText && (
                              <p className="mt-3 text-xs text-center italic text-gray-400 leading-relaxed">
                                {(category as any).headerText}
                              </p>
                            )}
                          </div>
                          {viewMode === 'grid' ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {category.menuItems.map((item, idx) => (
                                <div key={item.id} className="sr-hidden" style={{ animationDelay: `${idx * 60}ms` }}
                                  ref={(el) => {
                                    if (!el) return;
                                    const obs = new IntersectionObserver(([e]) => {
                                      if (e.isIntersecting) { setTimeout(() => el.classList.add('sr-visible'), idx * 60); obs.unobserve(el); }
                                    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
                                    obs.observe(el);
                                  }}
                                >
                                  <ItemCard
                                    item={item}
                                    currency={currency}
                                    onClick={() => openItem(item)}
                                    onAdd={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                                    orderingEnabled={orderingEnabled}
                                    highlight={item.id === highlightItemId}
                                    cardRadius={cardRadius}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : viewMode === 'compact' ? (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                              {category.menuItems.map((item) => {
                                const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openItem(item)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    {/* Thumbnail */}
                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                      {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                                      )}
                                    </div>
                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-900 leading-snug truncate">{item.name}</p>
                                      {item.description && (
                                        <p className="text-xs text-gray-600 mt-0.5 truncate">{item.description}</p>
                                      )}
                                    </div>
                                    {/* Price + add */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-sm font-bold" style={{ color: primaryColor }}>
                                        {new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(price)}
                                      </span>
                                      {orderingEnabled && item.isAvailable && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                          style={{ backgroundColor: primaryColor }}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4">
                              {category.menuItems.map((item) => (
                                <ItemRow
                                  key={item.id}
                                  item={item}
                                  currency={currency}
                                  onClick={() => openItem(item)}
                                  onAdd={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                                  orderingEnabled={orderingEnabled}
                                  highlight={item.id === highlightItemId}
                                  primaryColor={primaryColor}
                                />
                              ))}
                            </div>
                          )}
                          {(category as any).footerText && (
                            <p className="mt-4 text-xs text-center italic text-gray-400 leading-relaxed">
                              {(category as any).footerText}
                            </p>
                          )}
                        </section>
                      ))}
                    </div>
                  )}
                  {!noResults && activeSection.footerText && (
                    <div className="mt-10 px-4 py-3 rounded-xl text-sm text-center italic leading-relaxed border" style={{ borderColor: `${primaryColor}25`, color: `${primaryColor}BB` }}>
                      {activeSection.footerText}
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === 'uncategorized' && (() => {
              const q = searchQuery.trim().toLowerCase();
              let filtered = q
                ? menu.uncategorized.filter(i => i.name.toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q))
                : [...menu.uncategorized];
              if (dietaryFilters.has('vegan'))      filtered = filtered.filter(i => i.isVegan);
              if (dietaryFilters.has('vegetarian')) filtered = filtered.filter(i => i.isVegan || i.isVegetarian);
              if (dietaryFilters.has('spicy'))      filtered = filtered.filter(i => i.isSpicy);
              if (dietaryFilters.has('gf'))         filtered = filtered.filter(i => i.isGlutenFree);
              if (filtered.length === 0) return null;
              return (
                <div>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Other Items</h2>
                  </div>
                  {viewMode === 'grid' ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filtered.map((item, idx) => (
                        <div key={item.id} className="sr-hidden"
                          ref={(el) => {
                            if (!el) return;
                            const obs = new IntersectionObserver(([e]) => {
                              if (e.isIntersecting) { setTimeout(() => el.classList.add('sr-visible'), idx * 60); obs.unobserve(el); }
                            }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
                            obs.observe(el);
                          }}
                        >
                          <ItemCard
                            item={item}
                            currency={currency}
                            onClick={() => openItem(item)}
                            onAdd={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                            orderingEnabled={orderingEnabled}
                            highlight={item.id === highlightItemId}
                            cardRadius={cardRadius}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4">
                      {filtered.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          currency={currency}
                          onClick={() => openItem(item)}
                          onAdd={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                          orderingEnabled={orderingEnabled}
                          highlight={item.id === highlightItemId}
                          primaryColor={primaryColor}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      <FloatingCartButton
        count={cartCount}
        total={cartTotal}
        currency={currency}
        onClick={cart.openCart}
      />

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          currency={currency}
          onClose={closeItem}
          onAddToCart={handleAddToCart}
          orderingEnabled={orderingEnabled}
        />
      )}

      {selectedBundle && (
        <BundlePickerModal
          bundle={selectedBundle}
          menu={menu}
          currency={currency}
          onClose={() => setSelectedBundle(null)}
          onConfirm={(selections, price) => handleAddBundle(selectedBundle, selections, price)}
        />
      )}

      {/* Modifier Picker Modal */}
      {modifierItem && (
        <ModifierPickerModal
          item={modifierItem}
          currency={currency}
          onClose={() => setModifierItem(null)}
          onConfirm={(modifiers, totalAdj, summary) =>
            handleModifierConfirm(modifierItem, modifiers, totalAdj, summary)
          }
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        tenantSlug={tenantSlug}
        currency={currency}
        onCheckout={() => { cart.closeCart(); setShowCheckout(true); }}
      />

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          tenantSlug={tenantSlug}
          currency={currency}
          onClose={() => setShowCheckout(false)}
          onSuccess={(id) => { setShowCheckout(false); setSuccessOrderId(id); }}
        />
      )}

      {/* Order Success */}
      {successOrderId && (
        <OrderSuccessModal
          orderId={successOrderId}
          onClose={() => setSuccessOrderId(null)}
        />
      )}
    </div>
  );
}
