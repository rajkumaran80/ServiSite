'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
import { useTenantStore } from '../../../store/tenant.store';
import type { CmsPage } from '../../../types/page.types';

type NavLinkType = 'INTERNAL_FEATURE' | 'CUSTOM_PAGE' | 'EXTERNAL_URL' | 'PARENT_ONLY';

interface NavItem {
  id: string;
  label: string;
  linkType: NavLinkType;
  href: string | null;
  pageId: string | null;
  featureKey: string | null;
  parentId: string | null;
  isSystemReserved: boolean;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  children: NavItem[];
}

interface FlatItem extends Omit<NavItem, 'children'> {
  depth: number;
}

const INTERNAL_FEATURES_BASE = [
  { key: 'gallery', label: 'Gallery' },
];

const INTERNAL_FEATURES_FOOD = [
  { key: 'food_menu', label: 'Food Menu' },
];

function flattenTree(items: NavItem[], depth = 0): FlatItem[] {
  const result: FlatItem[] = [];
  for (const item of items) {
    result.push({ ...item, depth });
    if (item.children?.length) {
      result.push(...flattenTree(item.children, depth + 1));
    }
  }
  return result;
}

function linkLabel(item: FlatItem, pages: CmsPage[]): string {
  if (item.linkType === 'INTERNAL_FEATURE') return `Built-in: ${item.featureKey}`;
  if (item.linkType === 'CUSTOM_PAGE') {
    const p = pages.find((pg) => pg.id === item.pageId);
    return p ? `Page: /${p.slug}` : 'Page: (deleted)';
  }
  return item.href || '';
}

interface FormState {
  label: string;
  linkType: NavLinkType;
  href: string;
  pageId: string;
  featureKey: string;
  parentId: string;
  isActive: boolean;
  openInNewTab: boolean;
}

const emptyForm = (): FormState => ({
  label: '',
  linkType: 'EXTERNAL_URL',
  href: '',
  pageId: '',
  featureKey: '',
  parentId: '',
  isActive: true,
  openInNewTab: false,
});

export default function NavigationBuilderPage() {
  const { currentTenant } = useTenantStore();
  const isFoodService = !currentTenant || currentTenant.serviceProfile === 'FOOD_SERVICE';

  const [items, setItems] = useState<FlatItem[]>([]);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const internalFeatures = [
    ...INTERNAL_FEATURES_BASE,
    ...(isFoodService ? INTERNAL_FEATURES_FOOD : []),
  ];

  const load = useCallback(async () => {
    try {
      const [navRes, pagesRes] = await Promise.all([
        api.get('/navigation/admin'),
        api.get('/pages/admin'),
      ]);
      setItems(flattenTree(navRes.data.data || []));
      setPages(pagesRes.data.data || []);
    } catch {
      toast.error('Failed to load navigation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (item: FlatItem) => {
    setEditingId(item.id);
    setForm({
      label: item.label,
      linkType: item.linkType,
      href: item.href ?? '',
      pageId: item.pageId ?? '',
      featureKey: item.featureKey ?? '',
      parentId: item.parentId ?? '',
      isActive: item.isActive,
      openInNewTab: item.openInNewTab,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error('Label is required'); return; }
    if (form.linkType === 'EXTERNAL_URL' && !form.href.trim()) { toast.error('URL is required'); return; }
    if (form.linkType === 'CUSTOM_PAGE' && !form.pageId) { toast.error('Select a page'); return; }
    if (form.linkType === 'INTERNAL_FEATURE' && !form.featureKey) { toast.error('Select a feature'); return; }
    // PARENT_ONLY doesn't require any URL, page, or feature

    setIsSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        linkType: form.linkType,
        href: form.linkType === 'EXTERNAL_URL' ? form.href.trim() : null,
        pageId: form.linkType === 'CUSTOM_PAGE' ? form.pageId : null,
        featureKey: form.linkType === 'INTERNAL_FEATURE' ? form.featureKey : null,
        parentId: form.parentId || null,
        isActive: form.isActive,
        openInNewTab: form.openInNewTab,
      };
      if (editingId) {
        await api.put(`/navigation/${editingId}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/navigation', payload);
        toast.success('Item added');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this navigation item?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/navigation/${id}`);
      toast.success('Item removed');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (item: FlatItem) => {
    try {
      await api.put(`/navigation/${item.id}`, { isActive: !item.isActive });
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleMove = async (item: FlatItem, direction: 'up' | 'down') => {
    const siblings = items.filter((i) => i.parentId === item.parentId && i.depth === item.depth);
    const idx = siblings.findIndex((i) => i.id === item.id);
    const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
    if (!swapWith) return;
    try {
      await api.put('/navigation/reorder', {
        items: [
          { id: item.id, sortOrder: swapWith.sortOrder, parentId: item.parentId || null },
          { id: swapWith.id, sortOrder: item.sortOrder, parentId: swapWith.parentId || null },
        ],
      });
      load();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const topLevelItems = items.filter((i) => !i.parentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation</h1>
          <p className="text-gray-500 text-sm mt-1">Build your site's menu. Nest items to create dropdowns.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <p className="font-medium text-gray-500">No navigation items yet</p>
            <p className="text-sm mt-1">Click "Add Item" to build your menu</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {items.map((item) => {
              const siblings = items.filter((i) => i.parentId === item.parentId && i.depth === item.depth);
              const idx = siblings.findIndex((i) => i.id === item.id);
              return (
                <li key={item.id} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
                  {/* Depth indent */}
                  {item.depth > 0 && (
                    <div className="flex items-center gap-0 flex-shrink-0" style={{ width: item.depth * 20 }}>
                      <div className="w-4 h-px bg-gray-300" style={{ marginLeft: (item.depth - 1) * 20 }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                    </div>
                  )}

                  {/* Label + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{item.label}</span>
                      {item.isSystemReserved && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">system</span>
                      )}
                      {!item.isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">hidden</span>
                      )}
                      {item.depth > 0 && (
                        <span className="text-[10px] text-gray-400">L{item.depth + 1}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{linkLabel(item, pages)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleMove(item, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMove(item, 'down')}
                      disabled={idx === siblings.length - 1}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-20 transition-colors"
                      title="Move down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`p-1.5 rounded-lg transition-colors ${item.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                      title={item.isActive ? 'Hide' : 'Show'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {!item.isSystemReserved && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        {deletingId === item.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Home and Contact are system items — they can be renamed and reordered but not deleted.
        Create new pages in <a href="/dashboard/pages" className="underline hover:text-gray-600">Pages</a>, then add them here as Custom Page links at any level.
      </p>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">
              {editingId ? 'Edit Navigation Item' : 'Add Navigation Item'}
            </h2>

            {/* Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Label</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Services"
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Link Type — hidden for reserved items in edit mode */}
            {!(editingId && items.find((i) => i.id === editingId)?.isSystemReserved) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'INTERNAL_FEATURE', label: 'Built-in' },
                    { value: 'CUSTOM_PAGE', label: 'Custom Page' },
                    { value: 'EXTERNAL_URL', label: 'URL' },
                    { value: 'PARENT_ONLY', label: 'Parent Only' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, linkType: opt.value, href: '', pageId: '', featureKey: '' }))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        form.linkType === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Link target */}
            {form.linkType === 'INTERNAL_FEATURE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Feature</label>
                <select
                  value={form.featureKey}
                  onChange={(e) => setForm((f) => ({ ...f, featureKey: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select feature…</option>
                  {internalFeatures.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            )}

            {form.linkType === 'CUSTOM_PAGE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Page</label>
                <select
                  value={form.pageId}
                  onChange={(e) => setForm((f) => ({ ...f, pageId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select page…</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
                  ))}
                </select>
                {pages.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No pages yet — create one in Pages first.</p>
                )}
              </div>
            )}

            {form.linkType === 'EXTERNAL_URL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                <input
                  type="url"
                  value={form.href}
                  onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Parent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Parent <span className="text-gray-400 font-normal">(optional — nests this under another item)</span>
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">None (top level)</option>
                {items
                  .filter((i) => i.depth < 2 && i.id !== editingId) // Allow nesting up to 3 levels (depth 0, 1, 2)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {'  '.repeat(i.depth) + i.label} {i.depth > 0 && `(L${i.depth + 1})`}
                    </option>
                  ))}
              </select>
            </div>

            {/* Options */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">Visible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={(e) => setForm((f) => ({ ...f, openInNewTab: e.target.checked }))}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">Open in new tab</span>
              </label>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
