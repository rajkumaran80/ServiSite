'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import pricingService, { PricingRule, PricingRuleType, CreatePricingRulePayload } from '../../../../services/pricing.service';
import menuService from '../../../../services/menu.service';
import type { MenuItem } from '../../../../types/menu.types';

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const RULE_TYPES: { type: PricingRuleType; label: string; icon: string; description: string }[] = [
  { type: 'BOGO', label: 'Buy One Get One', icon: '🎁', description: 'Buy X items, get one free' },
  { type: 'PERCENTAGE', label: 'Percentage Off', icon: '%', description: 'X% off selected items or entire order' },
  { type: 'FIXED_AMOUNT', label: 'Fixed Amount Off', icon: '£', description: 'Fixed discount when order total exceeds minimum' },
  { type: 'HAPPY_HOUR', label: 'Happy Hour', icon: '🕐', description: 'Time-based discount on certain days' },
];

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

// ── Per-type form fields ──────────────────────────────────────────────────────

function BogoFields({ condition, action, onChange, menuItems }: any) {
  const itemIds: string[] = condition.itemIds ?? [];
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Apply to items (leave empty = any item)</label>
        <select className={inputClass} defaultValue=""
          onChange={(e) => { if (e.target.value && !itemIds.includes(e.target.value)) { onChange('condition', { ...condition, itemIds: [...itemIds, e.target.value] }); e.target.value = ''; } }}>
          <option value="">+ Add item</option>
          {menuItems.filter((m: MenuItem) => !itemIds.includes(m.id)).map((m: MenuItem) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {itemIds.map((id: string) => (
            <span key={id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              {menuItems.find((m: MenuItem) => m.id === id)?.name ?? id}
              <button type="button" onClick={() => onChange('condition', { ...condition, itemIds: itemIds.filter((i: string) => i !== id) })} className="text-blue-400 hover:text-blue-600">✕</button>
            </span>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Minimum quantity to trigger</label>
        <input type="number" min={2} className={inputClass} value={condition.minQty ?? 2}
          onChange={(e) => onChange('condition', { ...condition, minQty: parseInt(e.target.value) || 2 })} />
      </div>
      <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">Free item = cheapest qualifying item in the cart</p>
    </div>
  );
}

function PercentageFields({ condition, action, onChange, menuItems }: any) {
  const itemIds: string[] = condition.itemIds ?? [];
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Discount % *</label>
        <input type="number" min={1} max={100} className={inputClass} value={action.discountPct ?? ''}
          onChange={(e) => onChange('action', { ...action, discountPct: parseFloat(e.target.value) || 0 })} placeholder="e.g. 10" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Minimum order total (optional)</label>
        <input type="number" min={0} className={inputClass} value={condition.minOrderTotal ?? ''}
          onChange={(e) => onChange('condition', { ...condition, minOrderTotal: parseFloat(e.target.value) || undefined })} placeholder="Leave blank for no minimum" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Restrict to specific items (leave empty = entire order)</label>
        <select className={inputClass} defaultValue=""
          onChange={(e) => { if (e.target.value && !itemIds.includes(e.target.value)) { onChange('condition', { ...condition, itemIds: [...itemIds, e.target.value] }); e.target.value = ''; } }}>
          <option value="">+ Add item</option>
          {menuItems.filter((m: MenuItem) => !itemIds.includes(m.id)).map((m: MenuItem) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {itemIds.map((id: string) => (
            <span key={id} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              {menuItems.find((m: MenuItem) => m.id === id)?.name ?? id}
              <button type="button" onClick={() => onChange('condition', { ...condition, itemIds: itemIds.filter((i: string) => i !== id) })} className="text-blue-400 hover:text-blue-600">✕</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixedAmountFields({ condition, action, onChange }: any) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Discount amount *</label>
        <input type="number" min={0} className={inputClass} value={action.discountAmt ?? ''}
          onChange={(e) => onChange('action', { ...action, discountAmt: parseFloat(e.target.value) || 0 })} placeholder="e.g. 5.00" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Minimum order total *</label>
        <input type="number" min={0} className={inputClass} value={condition.minOrderTotal ?? ''}
          onChange={(e) => onChange('condition', { ...condition, minOrderTotal: parseFloat(e.target.value) || 0 })} placeholder="e.g. 30.00" />
      </div>
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HappyHourFields({ condition, action, onChange }: any) {
  const days: number[] = condition.days ?? [1, 2, 3, 4, 5];
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Discount % *</label>
        <input type="number" min={1} max={100} className={inputClass} value={action.discountPct ?? ''}
          onChange={(e) => onChange('action', { ...action, discountPct: parseFloat(e.target.value) || 0 })} placeholder="e.g. 20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Active days</label>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map((d, i) => (
            <button key={i} type="button"
              onClick={() => onChange('condition', { ...condition, days: days.includes(i) ? days.filter((x) => x !== i) : [...days, i] })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${days.includes(i) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From (HH:MM)</label>
          <input className={inputClass} value={condition.fromTime ?? ''} placeholder="17:00"
            onChange={(e) => onChange('condition', { ...condition, fromTime: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To (HH:MM)</label>
          <input className={inputClass} value={condition.toTime ?? ''} placeholder="19:00"
            onChange={(e) => onChange('condition', { ...condition, toTime: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

// ── Rule Form ─────────────────────────────────────────────────────────────────

const defaultCondition: Record<PricingRuleType, any> = {
  BOGO: { itemIds: [], minQty: 2 },
  PERCENTAGE: { itemIds: [], minOrderTotal: undefined },
  FIXED_AMOUNT: { minOrderTotal: 0 },
  HAPPY_HOUR: { days: [1, 2, 3, 4, 5], fromTime: '17:00', toTime: '19:00' },
};

const defaultAction: Record<PricingRuleType, any> = {
  BOGO: { type: 'FREE_ITEM' },
  PERCENTAGE: { discountPct: 10 },
  FIXED_AMOUNT: { discountAmt: 5 },
  HAPPY_HOUR: { discountPct: 20 },
};

function RuleForm({ rule, menuItems, onClose, onSave }: {
  rule: PricingRule | null;
  menuItems: MenuItem[];
  onClose: () => void;
  onSave: (r: PricingRule) => void;
}) {
  const [type, setType] = useState<PricingRuleType>(rule?.type ?? 'PERCENTAGE');
  const [name, setName] = useState(rule?.name ?? '');
  const [condition, setCondition] = useState(rule?.condition ?? defaultCondition[type]);
  const [action, setAction] = useState(rule?.action ?? defaultAction[type]);
  const [priority, setPriority] = useState(rule?.priority ?? 0);
  const [stackable, setStackable] = useState(rule?.stackable ?? false);
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (newType: PricingRuleType) => {
    setType(newType);
    setCondition(defaultCondition[newType]);
    setAction(defaultAction[newType]);
  };

  const patchField = (field: 'condition' | 'action', value: any) => {
    if (field === 'condition') setCondition(value);
    else setAction(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: CreatePricingRulePayload = { name: name.trim(), type, condition, action, priority, stackable, isActive };
      let result: PricingRule;
      if (rule) {
        result = await pricingService.updateRule(rule.id, payload);
        toast.success('Rule updated');
      } else {
        result = await pricingService.createRule(payload);
        toast.success('Rule created');
      }
      onSave(result);
    } catch {
      toast.error('Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = { condition, action, onChange: patchField, menuItems };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
        <div className="grid grid-cols-2 gap-2">
          {RULE_TYPES.map((rt) => (
            <button key={rt.type} type="button"
              onClick={() => handleTypeChange(rt.type)}
              className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-colors ${type === rt.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <span className="text-lg leading-none">{rt.icon}</span>
              <div>
                <p className={`text-xs font-semibold ${type === rt.type ? 'text-blue-700' : 'text-gray-800'}`}>{rt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{rt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Happy Hour 20% Off" />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Configure Rule</p>
        {type === 'BOGO' && <BogoFields {...fieldProps} />}
        {type === 'PERCENTAGE' && <PercentageFields {...fieldProps} />}
        {type === 'FIXED_AMOUNT' && <FixedAmountFields {...fieldProps} />}
        {type === 'HAPPY_HOUR' && <HappyHourFields {...fieldProps} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Priority (higher = applied first)</label>
          <input type="number" min={0} className={inputClass} value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600" checked={stackable} onChange={(e) => setStackable(e.target.checked)} />
            <span className="text-xs font-medium text-gray-700">Stackable (can combine with other rules)</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <p className="text-sm font-medium text-gray-900">Active</p>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : rule ? 'Save Changes' : 'Create Rule'}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const typeInfo: Record<PricingRuleType, { label: string; icon: string; color: string }> = {
  BOGO: { label: 'BOGO', icon: '🎁', color: 'bg-purple-100 text-purple-700' },
  PERCENTAGE: { label: '% Off', icon: '%', color: 'bg-green-100 text-green-700' },
  FIXED_AMOUNT: { label: 'Fixed Off', icon: '£', color: 'bg-blue-100 text-blue-700' },
  HAPPY_HOUR: { label: 'Happy Hour', icon: '🕐', color: 'bg-amber-100 text-amber-700' },
};

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [r, m] = await Promise.all([pricingService.listRules(), menuService.getItems()]);
      setRules(r);
      setMenuItems(m);
    } catch {
      toast.error('Failed to load pricing rules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pricing rule?')) return;
    setDeletingId(id);
    try {
      await pricingService.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('Rule deleted');
    } catch {
      toast.error('Failed to delete rule');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (rule: PricingRule) => {
    try {
      const updated = await pricingService.updateRule(rule.id, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch {
      toast.error('Failed to update rule');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-48 bg-gray-200 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/menu" className="text-gray-400 hover:text-gray-600 text-sm">Menu</Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
          </div>
          <p className="text-gray-500 text-sm">BOGO · Percentage Off · Fixed Discount · Happy Hour. Rules apply in priority order.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Rule
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RULE_TYPES.map((rt) => (
          <div key={rt.type} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="text-2xl mb-1">{rt.icon}</div>
            <p className="text-xs font-semibold text-gray-800">{rt.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{rt.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {rules.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏷️</div>
            <h3 className="font-semibold text-gray-700">No pricing rules yet</h3>
            <p className="text-gray-500 text-sm mt-1">Create discounts, happy hour deals, and BOGO offers</p>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {rules.map((rule) => {
              const info = typeInfo[rule.type];
              return (
                <div key={rule.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">{info.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{rule.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>
                      {!rule.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                      {rule.stackable && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Stackable</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Priority: {rule.priority}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${rule.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => { setEditing(rule); setShowForm(true); }} className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors">✏️</button>
                    <button onClick={() => handleDelete(rule.id)} disabled={deletingId === rule.id} className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors disabled:opacity-50">🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Rule' : 'Create Pricing Rule'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <RuleForm
            rule={editing}
            menuItems={menuItems}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={(saved) => {
              if (editing) {
                setRules((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
              } else {
                setRules((prev) => [...prev, saved]);
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
