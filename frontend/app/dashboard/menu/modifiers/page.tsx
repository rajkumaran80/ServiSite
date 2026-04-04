'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  addModifierOption,
  updateModifierOption,
  deleteModifierOption,
} from '../../../../services/billing.service';
import type {
  ModifierGroup,
  ModifierOption,
  CreateModifierGroupPayload,
  CreateModifierOptionPayload,
} from '../../../../types/billing.types';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Group Form ───────────────────────────────────────────────────────────────

function GroupForm({
  group,
  onClose,
  onSave,
}: {
  group: ModifierGroup | null;
  onClose: () => void;
  onSave: (g: ModifierGroup) => void;
}) {
  const [form, setForm] = useState<CreateModifierGroupPayload>({
    name: group?.name ?? '',
    type: group?.type ?? 'SINGLE_SELECT',
    required: group?.required ?? false,
    minSelect: group?.minSelect ?? 0,
    maxSelect: group?.maxSelect ?? 1,
    freeLimit: group?.freeLimit ?? 0,
    sortOrder: group?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CreateModifierGroupPayload, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const result = group
        ? await updateModifierGroup(group.id, form)
        : await createModifierGroup(form);
      toast.success(group ? 'Group updated' : 'Group created');
      onSave(result);
    } catch {
      toast.error('Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="e.g. Size, Extras, Sauce" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Selection Type</label>
        <select value={form.type} onChange={(e) => set('type', e.target.value as any)} className={inputClass}>
          <option value="SINGLE_SELECT">Single Select (choose one)</option>
          <option value="MULTI_SELECT">Multi Select (choose multiple)</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="required"
          checked={form.required}
          onChange={(e) => set('required', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600"
        />
        <label htmlFor="required" className="text-sm text-gray-700">Required (customer must choose)</label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Select</label>
          <input type="number" min={0} value={form.minSelect} onChange={(e) => set('minSelect', parseInt(e.target.value) || 0)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Select</label>
          <input type="number" min={1} value={form.maxSelect} onChange={(e) => set('maxSelect', parseInt(e.target.value) || 1)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Free Limit</label>
        <input type="number" min={0} value={form.freeLimit ?? 0} onChange={(e) => set('freeLimit', parseInt(e.target.value) || 0)} className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">First N selections are free (e.g. 2 free toppings, charged for extras)</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
        <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} className={inputClass} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl">
          {saving ? 'Saving…' : group ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

// ── Option Form ──────────────────────────────────────────────────────────────

function OptionForm({
  groupId,
  option,
  onClose,
  onSave,
}: {
  groupId: string;
  option: ModifierOption | null;
  onClose: () => void;
  onSave: (o: ModifierOption) => void;
}) {
  const [form, setForm] = useState<CreateModifierOptionPayload>({
    name: option?.name ?? '',
    priceAdjustment: option?.priceAdjustment ?? 0,
    isDefault: option?.isDefault ?? false,
    isAvailable: option?.isAvailable ?? true,
    sortOrder: option?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CreateModifierOptionPayload, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Option name is required'); return; }
    setSaving(true);
    try {
      const result = option
        ? await updateModifierOption(option.id, form)
        : await addModifierOption(groupId, form);
      toast.success(option ? 'Option updated' : 'Option added');
      onSave(result);
    } catch {
      toast.error('Failed to save option');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Option Name *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="e.g. Small, Large, Extra Cheese" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price Adjustment (£)</label>
        <input
          type="number"
          step="0.01"
          value={form.priceAdjustment}
          onChange={(e) => set('priceAdjustment', parseFloat(e.target.value) || 0)}
          className={inputClass}
          placeholder="0.00"
        />
        <p className="text-xs text-gray-400 mt-1">Use negative for discount, 0 for no change</p>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          Default selection
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
          Available
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
        <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)} className={inputClass} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl">
          {saving ? 'Saving…' : option ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [groupModal, setGroupModal] = useState<{ open: boolean; editing: ModifierGroup | null }>({
    open: false,
    editing: null,
  });
  const [optionModal, setOptionModal] = useState<{
    open: boolean;
    groupId: string;
    editing: ModifierOption | null;
  }>({ open: false, groupId: '', editing: null });

  useEffect(() => {
    getModifierGroups()
      .then(setGroups)
      .catch(() => toast.error('Failed to load modifier groups'))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteGroup = async (g: ModifierGroup) => {
    if (!confirm(`Delete modifier group "${g.name}" and all its options?`)) return;
    try {
      await deleteModifierGroup(g.id);
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      toast.success('Group deleted');
    } catch {
      toast.error('Failed to delete group');
    }
  };

  const handleDeleteOption = async (groupId: string, option: ModifierOption) => {
    if (!confirm(`Delete option "${option.name}"?`)) return;
    try {
      await deleteModifierOption(groupId, option.id);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== option.id) } : g,
        ),
      );
      toast.success('Option deleted');
    } catch {
      toast.error('Failed to delete option');
    }
  };

  const handleGroupSave = (result: ModifierGroup) => {
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.id === result.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...result };
        return next;
      }
      return [...prev, { ...result, options: [] }];
    });
    setGroupModal({ open: false, editing: null });
  };

  const handleOptionSave = (result: ModifierOption) => {
    const { groupId } = optionModal;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const idx = g.options.findIndex((o) => o.id === result.id);
        if (idx >= 0) {
          const options = [...g.options];
          options[idx] = result;
          return { ...g, options };
        }
        return { ...g, options: [...g.options, result] };
      }),
    );
    setOptionModal({ open: false, groupId: '', editing: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard/menu" className="hover:text-blue-600">Menu</Link>
            <span>/</span>
            <span>Modifiers</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Modifier Groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define sizes, extras, and customisation options. Assign groups to menu items.
          </p>
        </div>
        <button
          onClick={() => setGroupModal({ open: true, editing: null })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          <span className="text-lg leading-none">+</span> New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">&#9881;</p>
          <p className="font-medium text-gray-500">No modifier groups yet</p>
          <p className="text-sm mt-1">Create groups like &quot;Size&quot; or &quot;Extras&quot; to allow item customisation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <span className={`transition-transform ${expandedGroup === group.id ? 'rotate-90' : ''}`}>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                  <div>
                    <span className="font-medium text-gray-900">{group.name}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {group.type === 'SINGLE_SELECT' ? 'Single select' : 'Multi select'}
                      {group.required && ' · Required'}
                      {group.minSelect > 0 && ` · min ${group.minSelect}`}
                      {group.maxSelect > 1 && ` · max ${group.maxSelect}`}
                    </span>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">{group.options.length} option{group.options.length !== 1 ? 's' : ''}</span>
                </button>
                <button
                  onClick={() => setGroupModal({ open: true, editing: group })}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteGroup(group)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Options */}
              {expandedGroup === group.id && (
                <div className="border-t border-gray-100">
                  {group.options.length === 0 ? (
                    <p className="px-10 py-3 text-sm text-gray-400">No options yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-10 py-2 text-left">Option</th>
                          <th className="px-3 py-2 text-right">Price adj.</th>
                          <th className="px-3 py-2 text-center">Default</th>
                          <th className="px-3 py-2 text-center">Available</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {group.options.map((opt) => (
                          <tr key={opt.id} className="hover:bg-gray-50">
                            <td className="px-10 py-2 font-medium text-gray-800">{opt.name}</td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {opt.priceAdjustment > 0 ? `+£${opt.priceAdjustment.toFixed(2)}` : opt.priceAdjustment < 0 ? `-£${Math.abs(opt.priceAdjustment).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-center">{opt.isDefault ? '✓' : ''}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block w-2 h-2 rounded-full ${opt.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`} />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setOptionModal({ open: true, groupId: group.id, editing: opt })}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteOption(group.id, opt)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="px-10 py-3 border-t border-gray-50">
                    <button
                      onClick={() => setOptionModal({ open: true, groupId: group.id, editing: null })}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add option
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {groupModal.open && (
        <Modal
          title={groupModal.editing ? 'Edit Modifier Group' : 'New Modifier Group'}
          onClose={() => setGroupModal({ open: false, editing: null })}
        >
          <GroupForm
            group={groupModal.editing}
            onClose={() => setGroupModal({ open: false, editing: null })}
            onSave={handleGroupSave}
          />
        </Modal>
      )}

      {optionModal.open && (
        <Modal
          title={optionModal.editing ? 'Edit Option' : 'Add Option'}
          onClose={() => setOptionModal({ open: false, groupId: '', editing: null })}
        >
          <OptionForm
            groupId={optionModal.groupId}
            option={optionModal.editing}
            onClose={() => setOptionModal({ open: false, groupId: '', editing: null })}
            onSave={handleOptionSave}
          />
        </Modal>
      )}
    </div>
  );
}
