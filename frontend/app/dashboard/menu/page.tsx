'use client';

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import menuService from '../../../services/menu.service';
import uploadService from '../../../services/upload.service';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import type { MenuGroup, Category, MenuItem, CreateMenuGroupPayload, CreateCategoryPayload, CreateMenuItemPayload } from '../../../types/menu.types';

// ─── Small helper components ────────────────────────────────────────────────

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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

// ─── Group Form ────────────────────────────────────────────────────────────

function GroupForm({
  group,
  onClose,
  onSave,
}: {
  group: MenuGroup | null;
  onClose: () => void;
  onSave: (s: MenuGroup) => void;
}) {
  const [form, setForm] = useState<CreateMenuGroupPayload>({
    name: group?.name ?? '',
    icon: group?.icon ?? '',
    description: group?.description ?? '',
    servedFrom: group?.servedFrom ?? '',
    servedUntil: group?.servedUntil ?? '',
    isActive: group?.isActive ?? true,
    sortOrder: group?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof CreateMenuGroupPayload, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: CreateMenuGroupPayload = {
        name: form.name.trim(),
        icon: form.icon || undefined,
        description: form.description || undefined,
        servedFrom: form.servedFrom || undefined,
        servedUntil: form.servedUntil || undefined,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      };
      let result: MenuGroup;
      if (group) {
        result = await menuService.updateGroup(group.id, payload);
        toast.success('Group updated');
      } else {
        result = await menuService.createGroup(payload);
        toast.success('Group created');
      }
      onSave(result);
    } catch {
      toast.error(group ? 'Failed to update group' : 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <FieldRow label="Name *">
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Breakfast" />
          </FieldRow>
        </div>
        <FieldRow label="Icon (emoji)">
          <input className={inputClass} value={form.icon ?? ''} onChange={(e) => set('icon', e.target.value)} placeholder="🍳" />
        </FieldRow>
        <FieldRow label="Sort Order">
          <input type="number" min={0} className={inputClass} value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', parseInt(e.target.value, 10) || 0)} />
        </FieldRow>
      </div>
      <FieldRow label="Description">
        <textarea rows={2} className={inputClass} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Optional description..." />
      </FieldRow>
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Served From (HH:MM)">
          <input className={inputClass} value={form.servedFrom ?? ''} onChange={(e) => set('servedFrom', e.target.value)} placeholder="07:00" pattern="^\d{2}:\d{2}$" />
        </FieldRow>
        <FieldRow label="Served Until (HH:MM)">
          <input className={inputClass} value={form.servedUntil ?? ''} onChange={(e) => set('servedUntil', e.target.value)} placeholder="11:00" pattern="^\d{2}:\d{2}$" />
        </FieldRow>
      </div>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-900">Active</p>
          <p className="text-xs text-gray-500">Show this group on the public menu</p>
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
          {saving ? 'Saving...' : group ? 'Save Changes' : 'Create Group'}
        </button>
      </div>
    </form>
  );
}

// ─── Category Form ────────────────────────────────────────────────────────────

function CategoryForm({
  category,
  groups,
  onClose,
  onSave,
}: {
  category: Category | null;
  groups: MenuGroup[];
  onClose: () => void;
  onSave: (c: Category) => void;
}) {
  const [form, setForm] = useState<CreateCategoryPayload>({
    name: category?.name ?? '',
    description: category?.description ?? '',
    sortOrder: category?.sortOrder ?? 0,
    menuGroupId: category?.menuGroupId ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof CreateCategoryPayload, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: CreateCategoryPayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        sortOrder: form.sortOrder,
        menuGroupId: form.menuGroupId || undefined,
      };
      let result: Category;
      if (category) {
        result = await menuService.updateCategory(category.id, payload);
        toast.success('Category updated');
      } else {
        result = await menuService.createCategory(payload);
        toast.success('Category created');
      }
      onSave(result);
    } catch {
      toast.error(category ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldRow label="Name *">
        <input autoFocus className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Starters, Main Course" />
      </FieldRow>
      <FieldRow label="Description">
        <textarea rows={2} className={inputClass} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Optional description..." />
      </FieldRow>
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Group">
          <select className={inputClass} value={form.menuGroupId ?? ''} onChange={(e) => set('menuGroupId', e.target.value)}>
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.icon ? `${g.icon} ` : ''}{g.name}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Sort Order">
          <input type="number" min={0} className={inputClass} value={form.sortOrder ?? 0} onChange={(e) => set('sortOrder', parseInt(e.target.value, 10) || 0)} />
        </FieldRow>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : category ? 'Save Changes' : 'Create Category'}
        </button>
      </div>
    </form>
  );
}

// ─── Item Form ────────────────────────────────────────────────────────────────

function ItemForm({
  item,
  categories,
  groups,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  categories: Category[];
  groups: MenuGroup[];
  onClose: () => void;
  onSave: (i: MenuItem) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price != null ? String(item.price) : '',
    currency: item?.currency ?? 'GBP',
    imageUrl: item?.imageUrl ?? '',
    isAvailable: item?.isAvailable ?? true,
    isPopular: item?.isPopular ?? false,
    allergens: item?.allergens?.join(', ') ?? '',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(item?.categoryIds ?? []);
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const pendingImageFile = useRef<File | null>(null);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const visibleCategories = filterGroupId
    ? categories.filter((c) => c.menuGroupId === filterGroupId)
    : categories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error('Enter a valid price'); return; }
    setSaving(true);
    try {
      // Upload image to Azure now (on submit), if a new file was selected
      let imageUrl = form.imageUrl || undefined;
      if (pendingImageFile.current) {
        const uploaded = await uploadService.uploadFile(pendingImageFile.current, 'menu');
        imageUrl = uploaded.url;
        pendingImageFile.current = null;
      }

      const payload: CreateMenuItemPayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        price: priceNum,
        currency: form.currency || undefined,
        categoryIds: selectedCategoryIds,
        imageUrl,
        isAvailable: form.isAvailable,
        isPopular: form.isPopular,
        allergens: form.allergens
          ? form.allergens.split(',').map((a) => a.trim()).filter(Boolean)
          : [],
        sortOrder: form.sortOrder,
      };
      let result: MenuItem;
      if (item) {
        result = await menuService.updateItem(item.id, payload);
        toast.success('Item updated');
      } else {
        result = await menuService.createItem(payload);
        toast.success('Item created');
      }
      onSave(result);
    } catch {
      toast.error(item ? 'Failed to update item' : 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FieldRow label="Name *">
        <input autoFocus className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Full English Breakfast" />
      </FieldRow>
      <FieldRow label="Description">
        <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Short description..." />
      </FieldRow>
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Price *">
          <input type="text" inputMode="decimal" className={inputClass} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="9.99" />
        </FieldRow>
        <FieldRow label="Currency">
          <input className={inputClass} value={form.currency} onChange={(e) => set('currency', e.target.value)} placeholder="GBP" />
        </FieldRow>
      </div>

      {/* Categories — multi-select with optional group filter */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Categories
            {selectedCategoryIds.length > 0 && (
              <span className="ml-2 text-xs font-normal text-blue-600">{selectedCategoryIds.length} selected</span>
            )}
          </label>
          {groups.length > 0 && (
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.icon ? `${g.icon} ` : ''}{g.name}</option>
              ))}
            </select>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No categories yet — create one first.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {visibleCategories.map((cat) => {
              const checked = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                    checked
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                      checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-400">Item can appear in multiple categories</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
        <ImageUpload
          currentUrl={form.imageUrl || undefined}
          mediaType="menu"
          onFileSelected={(file) => {
            pendingImageFile.current = file;
            if (!file) set('imageUrl', '');
          }}
          aspectRatio="free"
          maxSizeMB={5}
        />
      </div>
      <FieldRow label="Allergens (comma-separated)">
        <input className={inputClass} value={form.allergens} onChange={(e) => set('allergens', e.target.value)} placeholder="gluten, dairy, eggs" />
      </FieldRow>
      <FieldRow label="Sort Order">
        <input type="number" min={0} className={inputClass} value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value, 10) || 0)} />
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Available</p>
            <p className="text-xs text-gray-500">Show to customers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Popular</p>
            <p className="text-xs text-gray-500">Show badge</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={form.isPopular} onChange={(e) => set('isPopular', e.target.checked)} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </form>
  );
}

// ─── Main Dashboard Menu Page ────────────────────────────────────────────────

export default function DashboardMenuPage() {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'groups' | 'categories' | 'items'>('groups');

  // Filter state
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');

  // Modal state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [grps, cats, menuItems] = await Promise.all([
        menuService.getGroups(),
        menuService.getCategories(),
        menuService.getItems(),
      ]);
      setGroups(grps);
      setCategories(cats);
      setItems(menuItems);
    } catch {
      toast.error('Failed to load menu data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Derived filtered lists
  const filteredCategories = filterGroupId
    ? categories.filter((c) => c.menuGroupId === filterGroupId)
    : categories;

  const filteredItems = items.filter((item) => {
    if (filterGroupId) {
      const itemCats = categories.filter((c) => item.categoryIds.includes(c.id));
      if (!itemCats.some((c) => c.menuGroupId === filterGroupId)) return false;
    }
    if (filterCategoryId && !item.categoryIds.includes(filterCategoryId)) return false;
    return true;
  });

  // ── Handlers ──

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Categories will become unassigned.')) return;
    setDeletingId(id);
    try {
      await menuService.deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setCategories((prev) => prev.map((c) => c.menuGroupId === id ? { ...c, menuGroupId: null } : c));
      toast.success('Group deleted');
    } catch {
      toast.error('Failed to delete group');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Items will become uncategorized.')) return;
    setDeletingId(id);
    try {
      await menuService.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    setDeletingId(id);
    try {
      await menuService.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Item deleted');
    } catch {
      toast.error('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updated = await menuService.updateItem(item.id, { isAvailable: !item.isAvailable });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch {
      toast.error('Failed to update availability');
    }
  };

  const getCategoryNames = (categoryIds: string[]) =>
    categoryIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean) as string[];

  const getGroupName = (groupId: string | null | undefined) => {
    if (!groupId) return null;
    const g = groups.find((grp) => grp.id === groupId);
    return g ? `${g.icon ?? ''} ${g.name}`.trim() : null;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            {groups.length} groups · {categories.length} categories · {items.length} items
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'groups' && (
            <button
              onClick={() => { setEditingGroup(null); setShowGroupForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Group
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Category
            </button>
          )}
          {activeTab === 'items' && (
            <button
              onClick={() => { setEditingItem(null); setShowItemForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Item
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['groups', 'categories', 'items'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'groups' ? `Groups (${groups.length})` : tab === 'categories' ? `Categories (${categories.length})` : `Items (${items.length})`}
          </button>
        ))}
      </div>

      {/* ── Groups Tab ── */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {groups.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📋</div>
              <h3 className="font-semibold text-gray-700">No groups yet</h3>
              <p className="text-gray-500 text-sm mt-1">Create groups like Breakfast, Lunch, Dinner</p>
              <button
                onClick={() => { setEditingGroup(null); setShowGroupForm(true); }}
                className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Group
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {group.icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{group.name}</span>
                      {!group.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {group.servedFrom && group.servedUntil && (
                      <p className="text-xs text-gray-500 mt-0.5">{group.servedFrom} – {group.servedUntil}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {group._count?.categories ?? 0} categories
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditingGroup(group); setShowGroupForm(true); }}
                      className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={deletingId === group.id}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Categories Tab ── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Group filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">Filter by group:</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.icon ? `${g.icon} ` : ''}{g.name}</option>
              ))}
            </select>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📂</div>
                <h3 className="font-semibold text-gray-700">No categories yet</h3>
                <button
                  onClick={() => { setEditingCategory(null); setShowCategoryForm(true); }}
                  className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Category
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                      📂
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{cat.name}</p>
                      {cat.description && (
                        <p className="text-sm text-gray-500 truncate">{cat.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cat._count?.menuItems ?? 0} items
                        {cat.menuGroupId && getGroupName(cat.menuGroupId) && (
                          <span className="ml-2 text-blue-500">· {getGroupName(cat.menuGroupId)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingCategory(cat); setShowCategoryForm(true); }}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        disabled={deletingId === cat.id}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors disabled:opacity-50"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Items Tab ── */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">Filter:</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterGroupId}
              onChange={(e) => { setFilterGroupId(e.target.value); setFilterCategoryId(''); }}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.icon ? `${g.icon} ` : ''}{g.name}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {(filterGroupId ? categories.filter((c) => c.menuGroupId === filterGroupId) : categories).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(filterGroupId || filterCategoryId) && (
              <button
                onClick={() => { setFilterGroupId(''); setFilterCategoryId(''); }}
                className="text-sm text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🍽️</div>
                <h3 className="font-semibold text-gray-700">No items found</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {filterGroupId || filterCategoryId ? 'Try adjusting the filters' : 'Add your first menu item'}
                </p>
                {!filterGroupId && !filterCategoryId && (
                  <button
                    onClick={() => { setEditingItem(null); setShowItemForm(true); }}
                    className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Item
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                        🍽️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{item.name}</span>
                        {item.isPopular && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Popular</span>
                        )}
                        {getCategoryNames(item.categoryIds).map((name) => (
                          <span key={name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {name}
                          </span>
                        ))}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">{item.description}</p>
                      )}
                      <span className="text-sm font-semibold text-blue-600">
                        {menuService.formatPrice(item.price, item.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                      <button
                        onClick={() => { setEditingItem(item); setShowItemForm(true); }}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded transition-colors"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={deletingId === item.id}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showGroupForm && (
        <Modal title={editingGroup ? 'Edit Group' : 'Add Group'} onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}>
          <GroupForm
            group={editingGroup}
            onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
            onSave={(saved) => {
              if (editingGroup) {
                setGroups((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
              } else {
                setGroups((prev) => [...prev, saved]);
              }
              setShowGroupForm(false);
              setEditingGroup(null);
            }}
          />
        </Modal>
      )}

      {showCategoryForm && (
        <Modal title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}>
          <CategoryForm
            category={editingCategory}
            groups={groups}
            onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}
            onSave={(saved) => {
              if (editingCategory) {
                setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
              } else {
                setCategories((prev) => [...prev, saved]);
              }
              setShowCategoryForm(false);
              setEditingCategory(null);
            }}
          />
        </Modal>
      )}

      {showItemForm && (
        <Modal title={editingItem ? 'Edit Item' : 'Add Item'} onClose={() => { setShowItemForm(false); setEditingItem(null); }}>
          <ItemForm
            item={editingItem}
            categories={categories}
            groups={groups}
            onClose={() => { setShowItemForm(false); setEditingItem(null); }}
            onSave={(saved) => {
              if (editingItem) {
                setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
              } else {
                setItems((prev) => [saved, ...prev]);
              }
              setShowItemForm(false);
              setEditingItem(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
