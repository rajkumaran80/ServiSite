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
}: {
  item: MenuItem;
  currency: string;
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
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
          {item.isPopular && (
            <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full">
              ⭐ Popular
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900 leading-snug">{item.name}</h2>
            <span className="text-base font-bold text-blue-700 flex-shrink-0">
              {formatPrice(item.price, currency)}
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
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

          {item.isAvailable && (
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

// ─── Item Card ─────────────────────────────────────────────────────────────────

function ItemCard({
  item,
  currency,
  onClick,
  onAdd,
}: {
  item: MenuItem;
  currency: string;
  onClick: () => void;
  onAdd: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
      <button type="button" onClick={onClick} className="text-left flex-1 flex flex-col">
        {item.imageUrl ? (
          <div className="relative">
            <img src={item.imageUrl} alt={item.name} className="w-full h-44 object-cover" />
            {item.isPopular && (
              <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">
                Popular
              </span>
            )}
          </div>
        ) : (
          <div className="relative w-full h-44 bg-gray-100 flex items-center justify-center text-4xl">
            🍽️
            {item.isPopular && (
              <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">
                Popular
              </span>
            )}
          </div>
        )}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-gray-900 leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{item.description}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-base font-bold text-blue-700">
              {formatPrice(item.price, currency)}
            </span>
            {item.allergens && item.allergens.length > 0 && (
              <span className="text-xs text-gray-400">{item.allergens.length} allergen{item.allergens.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </button>

      {/* Add to cart button */}
      {item.isAvailable && (
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

  const cart = useCartStore();

  useEffect(() => {
    if (!tenantSlug) return;
    cart.setTenant(tenantSlug);
    Promise.all([getTenant(tenantSlug), getFullMenu(tenantSlug)]).then(([t, m]) => {
      setTenant(t);
      setMenu(m);
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
  const activeSection = menu.groups.find((s) => s.id === activeTab);
  const hasContent =
    menu.groups.some((s) => s.categories?.some((c) => c.menuItems && c.menuItems.length > 0)) ||
    menu.uncategorized.length > 0;

  const cartTotal = cart.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const cartCount = cart.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Page Header */}
      <div
        className="py-16 px-6 text-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}99)` }}
      >
        <div className="text-5xl mb-4">{isRestaurant ? '🍽️' : '🛠️'}</div>
        <h1 className="text-4xl font-bold text-white mb-2">
          {isRestaurant ? 'Our Menu' : 'Our Services'}
        </h1>
        <p className="text-white/75 text-lg">{tenant.name}</p>
      </div>

      {/* Group Tab Bar */}
      {menu.groups.length > 0 && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center gap-1 overflow-x-auto py-2 scrollbar-none">
              {menu.groups.map((group) => {
                const isActive = activeTab === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => setActiveTab(group.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}55` } : {}}
                  >
                    {group.icon && <span className="text-base leading-none">{group.icon}</span>}
                    {group.name}
                  </button>
                );
              })}
              {menu.uncategorized.length > 0 && (
                <button
                  onClick={() => setActiveTab('uncategorized')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === 'uncategorized' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={activeTab === 'uncategorized' ? { backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}55` } : {}}
                >
                  Other
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!hasContent ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">{isRestaurant ? '🍽️' : '🛠️'}</div>
            <h2 className="text-xl font-semibold text-gray-700">No items yet</h2>
            <p className="text-gray-500 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div>
            {activeSection && (
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
                </div>

                <div className="space-y-12">
                  {activeSection.categories?.map((category) => {
                    if (!category.menuItems?.length) return null;
                    return (
                      <section key={category.id}>
                        <div className="mb-5">
                          <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {category.menuItems.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              currency={currency}
                              onClick={() => openItem(item)}
                              onAdd={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'uncategorized' && menu.uncategorized.length > 0 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Other Items</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {menu.uncategorized.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      currency={currency}
                      onClick={() => openItem(item)}
                      onAdd={(e) => { e.stopPropagation(); handleAddToCart(item); }}
                    />
                  ))}
                </div>
              </div>
            )}
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
