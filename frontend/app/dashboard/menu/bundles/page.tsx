'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';
import bundlesService, { Bundle, CreateBundlePayload, BundleSlot, BundleSlotSource } from '../../../../services/bundles.service';
import menuService from '../../../../services/menu.service';
import type { MenuItem, MenuGroup, Category } from '../../../../types/menu.types';

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Slot Editor ──────────────────────────────────────────────────────────────

function SlotEditor({
  slots,
  onChange,
  menuGroups,
  categories,
  menuItems,
}: {
  slots: BundleSlot[];
  onChange: (slots: BundleSlot[]) => void;
  menuGroups: MenuGroup[];
  categories: Category[];
  menuItems: MenuItem[];
}) {
  const addSlot = () => {
    onChange([...slots, { name: '', minSelection: 1, maxSelection: 1, sortOrder: slots.length, sources: [] }]);
  };

  const updateSlot = (i: number, patch: Partial<BundleSlot>) => {
    const updated = slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange(updated);
  };

  const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i));

  const addSource = (slotIdx: number, sourceType: BundleSlotSource['sourceType'], sourceId: string) => {
    const slot = slots[slotIdx];
    if (!sourceId) return;
    if (slot.sources.some((s) => s.sourceType === sourceType && s.sourceId === sourceId)) return;
    updateSlot(slotIdx, { sources: [...slot.sources, { sourceType, sourceId }] });
  };

  const removeSource = (slotIdx: number, srcIdx: number) => {
    const slot = slots[slotIdx];
    updateSlot(slotIdx, { sources: slot.sources.filter((_, i) => i !== srcIdx) });
  };

  const sourceName = (src: BundleSlotSource) => {
    if (src.sourceType === 'MENU_GROUP') return menuGroups.find((g) => g.id === src.sourceId)?.name ?? src.sourceId;
    if (src.sourceType === 'CATEGORY') return categories.find((c) => c.id === src.sourceId)?.name ?? src.sourceId;
    return menuItems.find((m) => m.id === src.sourceId)?.name ?? src.sourceId;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Bundle Slots</p>
        <button type="button" onClick={addSlot} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
          + Add Slot
        </button>
      </div>
      {slots.length === 0 && (
        <p className="text-sm text-gray-400 italic">No slots yet. Add slots to define what customers can choose.</p>
      )}
      {slots.map((slot, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="flex items-center gap-2">
            <input
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Slot name, e.g. Choose your pizza"
              value={slot.name}
              onChange={(e) => updateSlot(i, { name: e.target.value })}
            />
            <button type="button" onClick={() => removeSlot(i)} className="text-red-400 hover:text-red-600 p-1 rounded">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min selection</label>
              <input type="number" min={1} className={inputClass} value={slot.minSelection}
                onChange={(e) => updateSlot(i, { minSelection: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max selection</label>
              <input type="number" min={1} className={inputClass} value={slot.maxSelection}
                onChange={(e) => updateSlot(i, { maxSelection: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          {/* Sources */}
          <div>
            <p className="text-xs text-gray-600 mb-1.5">Items pool (choose from group, category, or specific item):</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {slot.sources.map((src, si) => (
                <span key={si} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  <span className="text-blue-400 text-xs">{src.sourceType === 'MENU_GROUP' ? 'Group' : src.sourceType === 'CATEGORY' ? 'Cat' : 'Item'}:</span>
                  {sourceName(src)}
                  <button type="button" onClick={() => removeSource(i, si)} className="ml-0.5 text-blue-400 hover:text-blue-600">✕</button>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { addSource(i, 'MENU_GROUP', e.target.value); e.target.value = ''; } }}>
                <option value="">+ Group</option>
                {menuGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { addSource(i, 'CATEGORY', e.target.value); e.target.value = ''; } }}>
                <option value="">+ Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { addSource(i, 'ITEM', e.target.value); e.target.value = ''; } }}>
                <option value="">+ Item</option>
                {menuItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bundle Form ──────────────────────────────────────────────────────────────

function BundleForm({
  bundle,
  menuGroups,
  categories,
  menuItems,
  currency,
  onClose,
  onSave,
}: {
  bundle: Bundle | null;
  menuGroups: MenuGroup[];
  categories: Category[];
  menuItems: MenuItem[];
  currency: string;
  onClose: () => void;
  onSave: (b: Bundle) => void;
}) {
  const [form, setForm] = useState({
    name: bundle?.name ?? '',
    description: bundle?.description ?? '',
    pricingType: bundle?.pricingType ?? 'FIXED' as const,
    basePrice: bundle?.basePrice != null ? String(bundle.basePrice) : '',
    discountPct: bundle?.discountPct != null ? String(bundle.discountPct) : '',
    isActive: bundle?.isActive ?? true,
    sortOrder: bundle?.sortOrder ?? 0,
  });
  const [slots, setSlots] = useState<BundleSlot[]>(bundle?.slots ?? []);
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: CreateBundlePayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        pricingType: form.pricingType,
        basePrice: form.basePrice ? parseFloat(form.basePrice) : undefined,
        discountPct: form.discountPct ? parseFloat(form.discountPct) : undefined,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
        slots,
      };
      let result: Bundle;
      if (bundle) {
        result = await bundlesService.update(bundle.id, payload);
        toast.success('Bundle updated');
      } else {
        result = await bundlesService.create(payload);
        toast.success('Bundle created');
      }
      onSave(result);
    } catch {
      toast.error('Failed to save bundle');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Family Meal Deal" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={2} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Type</label>
        <div className="grid grid-cols-3 gap-2">
          {(['FIXED', 'SUM', 'DISCOUNTED'] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => set('pricingType', t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${form.pricingType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
              {t === 'FIXED' ? 'Fixed Price' : t === 'SUM' ? 'Sum of Items' : 'Discounted'}
            </button>
          ))}
        </div>
      </div>
      {form.pricingType === 'FIXED' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Price ({currency})</label>
          <input type="text" inputMode="decimal" className={inputClass} value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} placeholder="19.99" />
        </div>
      )}
      {form.pricingType === 'DISCOUNTED' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
          <input type="text" inputMode="decimal" className={inputClass} value={form.discountPct} onChange={(e) => set('discountPct', e.target.value)} placeholder="10" />
        </div>
      )}

      <SlotEditor slots={slots} onChange={setSlots} menuGroups={menuGroups} categories={categories} menuItems={menuItems} />

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <p className="text-sm font-medium text-gray-900">Active</p>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [currency, setCurrency] = useState('GBP');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [b, g, c, m, tenantRes] = await Promise.all([
        bundlesService.listAll(),
        menuService.getGroups(),
        menuService.getCategories(),
        menuService.getItems(),
        api.get('/tenant/current'),
      ]);
      setBundles(b);
      setMenuGroups(g);
      setCategories(c);
      setMenuItems(m);
      setCurrency(tenantRes.data?.data?.currency ?? 'GBP');
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bundle?')) return;
    setDeletingId(id);
    try {
      await bundlesService.delete(id);
      setBundles((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bundle deleted');
    } catch {
      toast.error('Failed to delete bundle');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (bundle: Bundle) => {
    try {
      const updated = await bundlesService.update(bundle.id, { isActive: !bundle.isActive });
      setBundles((prev) => prev.map((b) => (b.id === bundle.id ? updated : b)));
    } catch {
      toast.error('Failed to update bundle');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-48 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/menu" className="text-gray-400 hover:text-gray-600 text-sm">Menu</Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Bundles & Combos</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Create combo deals where customers choose items from defined slots.
            <span className="ml-2 text-gray-400">
              Pricing: <strong>Fixed</strong> = set price · <strong>Sum</strong> = total of chosen items · <strong>Discounted</strong> = sum minus X%
            </span>
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Create Bundle
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {bundles.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎁</div>
            <h3 className="font-semibold text-gray-700">No bundles yet</h3>
            <p className="text-gray-500 text-sm mt-1">Create a Family Meal Deal, Combo, or Meal Kit</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Bundle
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🎁</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{bundle.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bundle.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {bundle.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{bundle.pricingType}</span>
                  </div>
                  {bundle.description && <p className="text-sm text-gray-500 truncate mt-0.5">{bundle.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {bundle.slots.length} slot{bundle.slots.length !== 1 ? 's' : ''}
                    {bundle.pricingType === 'FIXED' && bundle.basePrice != null && ` · ${currency} ${bundle.basePrice}`}
                    {bundle.pricingType === 'DISCOUNTED' && bundle.discountPct != null && ` · ${bundle.discountPct}% off`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(bundle)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${bundle.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {bundle.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => { setEditing(bundle); setShowForm(true); }}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(bundle.id)}
                    disabled={deletingId === bundle.id}
                    className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors disabled:opacity-50"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Bundle' : 'Create Bundle'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <BundleForm
            bundle={editing}
            menuGroups={menuGroups}
            categories={categories}
            menuItems={menuItems}
            currency={currency}
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
