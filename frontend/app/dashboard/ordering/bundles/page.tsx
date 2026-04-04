'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import orderingService from '../../../../services/ordering.service';
import type { Bundle, BundlePricingType, CreateBundlePayload } from '../../../../types/ordering.types';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const PRICING_LABELS: Record<BundlePricingType, string> = {
  FIXED: 'Fixed price',
  SUM: 'Sum of selected items',
  DISCOUNTED: 'Sum with % discount',
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const defaultForm: CreateBundlePayload = {
  name: '',
  description: '',
  pricingType: 'FIXED',
  basePrice: undefined,
  discountPct: undefined,
  isActive: true,
  sortOrder: 0,
};

function BundleForm({
  bundle,
  onClose,
  onSave,
}: {
  bundle: Bundle | null;
  onClose: () => void;
  onSave: (b: Bundle) => void;
}) {
  const [form, setForm] = useState<CreateBundlePayload>(
    bundle
      ? {
          name: bundle.name,
          description: bundle.description ?? '',
          pricingType: bundle.pricingType,
          basePrice: bundle.basePrice != null ? Number(bundle.basePrice) : undefined,
          discountPct: bundle.discountPct != null ? Number(bundle.discountPct) : undefined,
          isActive: bundle.isActive,
          sortOrder: bundle.sortOrder,
        }
      : defaultForm,
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof CreateBundlePayload, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.pricingType === 'FIXED' && (!form.basePrice || form.basePrice <= 0)) {
      toast.error('Fixed price is required'); return;
    }
    if (form.pricingType === 'DISCOUNTED' && (!form.discountPct || form.discountPct <= 0)) {
      toast.error('Discount % is required'); return;
    }
    setSaving(true);
    try {
      const payload: CreateBundlePayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        pricingType: form.pricingType,
        basePrice: form.pricingType !== 'SUM' ? form.basePrice : undefined,
        discountPct: form.pricingType === 'DISCOUNTED' ? form.discountPct : undefined,
        isActive: form.isActive,
        sortOrder: form.sortOrder ?? 0,
      };
      let result: Bundle;
      if (bundle) {
        result = await orderingService.updateBundle(bundle.id, payload);
        toast.success('Bundle updated');
      } else {
        result = await orderingService.createBundle(payload);
        toast.success('Bundle created');
      }
      onSave(result);
    } catch (err: any) {
      toast.error(err?.message || (bundle ? 'Failed to update' : 'Failed to create'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Burger Meal Deal" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={2} className={inputClass} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="What's included..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type *</label>
        <select className={inputClass} value={form.pricingType} onChange={(e) => set('pricingType', e.target.value as BundlePricingType)}>
          {(Object.keys(PRICING_LABELS) as BundlePricingType[]).map((pt) => (
            <option key={pt} value={pt}>{PRICING_LABELS[pt]}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {form.pricingType === 'FIXED' && 'Customer pays a fixed price regardless of what they choose.'}
          {form.pricingType === 'SUM' && 'Customer pays the sum of the items they select.'}
          {form.pricingType === 'DISCOUNTED' && 'Customer pays the sum of selected items minus a percentage discount.'}
        </p>
      </div>

      {(form.pricingType === 'FIXED') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Price *</label>
          <input type="number" min={0} step={0.01} className={inputClass} value={form.basePrice ?? ''} onChange={(e) => set('basePrice', parseFloat(e.target.value) || undefined)} placeholder="9.99" />
        </div>
      )}

      {form.pricingType === 'DISCOUNTED' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount % *</label>
          <input type="number" min={1} max={100} step={1} className={inputClass} value={form.discountPct ?? ''} onChange={(e) => set('discountPct', parseFloat(e.target.value) || undefined)} placeholder="15" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" min={0} className={inputClass} value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', parseInt(e.target.value, 10) || 0)} />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-900">Active</p>
          <p className="text-xs text-gray-500">Show on public menu</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={form.isActive ?? true} onChange={(e) => set('isActive', e.target.checked)} />
          <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : bundle ? 'Save Changes' : 'Create Bundle'}
        </button>
      </div>
    </form>
  );
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    orderingService.getBundlesAdmin()
      .then(setBundles)
      .catch(() => toast.error('Failed to load bundles'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;
    setDeletingId(id);
    try {
      await orderingService.deleteBundle(id);
      setBundles((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bundle deleted');
    } catch {
      toast.error('Failed to delete bundle');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ordering" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bundles</h1>
            <p className="text-gray-500 text-sm mt-0.5">{bundles.length} bundle{bundles.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Bundle
        </button>
      </div>

      {/* Info callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>Bundles</strong> let customers choose combinations (e.g. "Meal Deal — choose a main + side + drink").
        After creating a bundle, link it to Choice Groups to define what customers can pick.
      </div>

      {/* Bundles list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-3">🎁</div>
          <h3 className="font-semibold text-gray-700">No bundles yet</h3>
          <p className="text-gray-500 text-sm mt-1">Create bundles like Meal Deals, Combos, or Set Menus.</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Bundle
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{bundle.name}</span>
                    {!bundle.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {PRICING_LABELS[bundle.pricingType]}
                    {bundle.pricingType === 'FIXED' && bundle.basePrice != null && (
                      <> · £{Number(bundle.basePrice).toFixed(2)}</>
                    )}
                    {bundle.pricingType === 'DISCOUNTED' && bundle.discountPct != null && (
                      <> · {Number(bundle.discountPct)}% off</>
                    )}
                  </p>
                  {bundle.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{bundle.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditing(bundle); setShowForm(true); }}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(bundle.id)}
                    disabled={deletingId === bundle.id}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Bundle' : 'New Bundle'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <BundleForm
            bundle={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={(saved) => {
              if (editing) {
                setBundles((prev) => prev.map((b) => (b.id === saved.id ? saved : b)));
              } else {
                setBundles((prev) => [...prev, saved]);
              }
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
