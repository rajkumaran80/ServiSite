'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import orderingService from '../../../../services/ordering.service';
import type { PricingRule, PricingRuleType, CreatePricingRulePayload } from '../../../../types/ordering.types';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

const RULE_TYPE_META: Record<PricingRuleType, { label: string; icon: string; description: string }> = {
  PERCENTAGE: { label: 'Percentage Off', icon: '%', description: 'Take % off the subtotal or specific items' },
  FIXED_AMOUNT: { label: 'Fixed Amount Off', icon: '£', description: 'Deduct a fixed amount from the total' },
  BOGO: { label: 'Buy One Get One', icon: '2×', description: 'Buy one item, get another free (or at a discount)' },
  HAPPY_HOUR: { label: 'Happy Hour', icon: '⏰', description: 'Apply a discount during specific time windows' },
};

function ruleTypeBadge(type: PricingRuleType) {
  const meta = RULE_TYPE_META[type];
  const colors: Record<PricingRuleType, string> = {
    PERCENTAGE: 'bg-blue-100 text-blue-700',
    FIXED_AMOUNT: 'bg-green-100 text-green-700',
    BOGO: 'bg-amber-100 text-amber-700',
    HAPPY_HOUR: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors[type]}`}>
      {meta.label}
    </span>
  );
}

function describeRule(rule: PricingRule): string {
  switch (rule.type) {
    case 'PERCENTAGE': {
      const pct = rule.action?.pct;
      const min = rule.condition?.minSubtotal;
      return `${pct}% off${min ? ` on orders over £${min}` : ''}`;
    }
    case 'FIXED_AMOUNT': {
      const amt = rule.action?.amount;
      const min = rule.condition?.minSubtotal;
      return `£${amt} off${min ? ` on orders over £${min}` : ''}`;
    }
    case 'BOGO':
      return 'Buy one, get one free';
    case 'HAPPY_HOUR': {
      const [from, to] = rule.condition?.window ?? [];
      const pct = rule.action?.pct;
      return `${pct}% off ${from ?? '?'}–${to ?? '?'}`;
    }
    default:
      return '';
  }
}

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

interface RuleFormState {
  name: string;
  type: PricingRuleType;
  // PERCENTAGE & FIXED_AMOUNT
  pct: string;
  amount: string;
  minSubtotal: string;
  // HAPPY_HOUR
  windowFrom: string;
  windowTo: string;
  happyPct: string;
  // shared
  priority: number;
  stackable: boolean;
  isActive: boolean;
}

function toPayload(f: RuleFormState): CreatePricingRulePayload {
  let condition: Record<string, any> = {};
  let action: Record<string, any> = {};

  switch (f.type) {
    case 'PERCENTAGE':
      condition = f.minSubtotal ? { minSubtotal: parseFloat(f.minSubtotal) } : {};
      action = { pct: parseFloat(f.pct) };
      break;
    case 'FIXED_AMOUNT':
      condition = f.minSubtotal ? { minSubtotal: parseFloat(f.minSubtotal) } : {};
      action = { amount: parseFloat(f.amount) };
      break;
    case 'BOGO':
      condition = {};
      action = { free: true };
      break;
    case 'HAPPY_HOUR':
      condition = { window: [f.windowFrom, f.windowTo] };
      action = { pct: parseFloat(f.happyPct) };
      break;
  }

  return {
    name: f.name.trim(),
    type: f.type,
    condition,
    action,
    priority: f.priority,
    stackable: f.stackable,
    isActive: f.isActive,
  };
}

function fromRule(rule: PricingRule): RuleFormState {
  return {
    name: rule.name,
    type: rule.type,
    pct: rule.type === 'PERCENTAGE' ? String(rule.action?.pct ?? '') : '',
    amount: rule.type === 'FIXED_AMOUNT' ? String(rule.action?.amount ?? '') : '',
    minSubtotal: String(rule.condition?.minSubtotal ?? ''),
    windowFrom: rule.condition?.window?.[0] ?? '',
    windowTo: rule.condition?.window?.[1] ?? '',
    happyPct: rule.type === 'HAPPY_HOUR' ? String(rule.action?.pct ?? '') : '',
    priority: rule.priority,
    stackable: rule.stackable,
    isActive: rule.isActive,
  };
}

const defaultForm: RuleFormState = {
  name: '', type: 'PERCENTAGE', pct: '', amount: '', minSubtotal: '',
  windowFrom: '17:00', windowTo: '19:00', happyPct: '',
  priority: 10, stackable: true, isActive: true,
};

function RuleForm({ rule, onClose, onSave }: { rule: PricingRule | null; onClose: () => void; onSave: (r: PricingRule) => void }) {
  const [form, setForm] = useState<RuleFormState>(rule ? fromRule(rule) : defaultForm);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof RuleFormState, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required';
    if (form.type === 'PERCENTAGE' && (!form.pct || isNaN(parseFloat(form.pct)))) return 'Discount % is required';
    if (form.type === 'FIXED_AMOUNT' && (!form.amount || isNaN(parseFloat(form.amount)))) return 'Discount amount is required';
    if (form.type === 'HAPPY_HOUR') {
      if (!form.windowFrom || !form.windowTo) return 'Time window is required';
      if (!form.happyPct || isNaN(parseFloat(form.happyPct))) return 'Discount % is required';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const payload = toPayload(form);
      let result: PricingRule;
      if (rule) {
        result = await orderingService.updatePricingRule(rule.id, payload);
        toast.success('Rule updated');
      } else {
        result = await orderingService.createPricingRule(payload);
        toast.success('Rule created');
      }
      onSave(result);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
        <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 10% off all orders" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type *</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(RULE_TYPE_META) as PricingRuleType[]).map((t) => (
            <button
              key={t} type="button"
              onClick={() => set('type', t)}
              className={`p-3 rounded-xl border text-left transition-colors ${form.type === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{RULE_TYPE_META[t].icon}</span>
                <span className="text-sm font-medium text-gray-900">{RULE_TYPE_META[t].label}</span>
              </div>
              <p className="text-xs text-gray-500">{RULE_TYPE_META[t].description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* PERCENTAGE fields */}
      {form.type === 'PERCENTAGE' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount % *</label>
            <input type="number" min={1} max={100} className={inputClass} value={form.pct} onChange={(e) => set('pct', e.target.value)} placeholder="10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min. order (optional)</label>
            <input type="number" min={0} step={0.01} className={inputClass} value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} placeholder="0.00" />
          </div>
        </div>
      )}

      {/* FIXED_AMOUNT fields */}
      {form.type === 'FIXED_AMOUNT' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount off (£) *</label>
            <input type="number" min={0.01} step={0.01} className={inputClass} value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="5.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min. order (optional)</label>
            <input type="number" min={0} step={0.01} className={inputClass} value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} placeholder="0.00" />
          </div>
        </div>
      )}

      {/* BOGO fields */}
      {form.type === 'BOGO' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
          BOGO applies automatically — the cheapest qualifying item is made free. You can attach this rule to specific items via choice groups.
        </div>
      )}

      {/* HAPPY_HOUR fields */}
      {form.type === 'HAPPY_HOUR' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From (HH:MM) *</label>
              <input className={inputClass} value={form.windowFrom} onChange={(e) => set('windowFrom', e.target.value)} placeholder="17:00" pattern="^\d{2}:\d{2}$" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To (HH:MM) *</label>
              <input className={inputClass} value={form.windowTo} onChange={(e) => set('windowTo', e.target.value)} placeholder="19:00" pattern="^\d{2}:\d{2}$" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount % *</label>
            <input type="number" min={1} max={100} className={inputClass} value={form.happyPct} onChange={(e) => set('happyPct', e.target.value)} placeholder="20" />
          </div>
        </div>
      )}

      {/* Shared settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <input type="number" min={1} max={1000} className={inputClass} value={form.priority} onChange={(e) => set('priority', parseInt(e.target.value, 10) || 10)} />
          <p className="text-xs text-gray-400 mt-1">Higher = applied first</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Stackable</p>
            <p className="text-xs text-gray-500">Allow with other rules</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={form.stackable} onChange={(e) => set('stackable', e.target.checked)} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex-1 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Active</p>
            <p className="text-xs text-gray-500">Apply to orders</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
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

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    orderingService.getPricingRules()
      .then(setRules)
      .catch(() => toast.error('Failed to load pricing rules'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    setDeletingId(id);
    try {
      await orderingService.deletePricingRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('Rule deleted');
    } catch {
      toast.error('Failed to delete rule');
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
            <h1 className="text-2xl font-bold text-gray-900">Pricing Rules</h1>
            <p className="text-gray-500 text-sm mt-0.5">{rules.length} rule{rules.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Rule
        </button>
      </div>

      {/* Info callout */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        Rules are evaluated by <strong>priority</strong> (highest first). Non-stackable rules block lower-priority rules from applying once triggered.
      </div>

      {/* Rules list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="text-5xl mb-3">🏷️</div>
          <h3 className="font-semibold text-gray-700">No rules yet</h3>
          <p className="text-gray-500 text-sm mt-1">Create discounts, BOGO offers, or happy hour deals.</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Rule
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {[...rules].sort((a, b) => b.priority - a.priority).map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-mono font-bold text-gray-600">
                  {rule.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{rule.name}</span>
                    {ruleTypeBadge(rule.type)}
                    {!rule.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                    {!rule.stackable && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Non-stackable</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{describeRule(rule)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditing(rule); setShowForm(true); }}
                    className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    disabled={deletingId === rule.id}
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
        <Modal title={editing ? 'Edit Rule' : 'New Pricing Rule'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <RuleForm
            rule={editing}
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
