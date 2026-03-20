'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import menuService from '../../../services/menu.service';
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

// ─── Section Form ────────────────────────────────────────────────────────────

function SectionForm({
  section,
  onClose,
  onSave,
}: {
  section: MenuGroup | null;
  onClose: () => void;
  onSave: (s: MenuGroup) => void;
}) {
  const [form, setForm] = useState<CreateMenuGroupPayload>({
    name: section?.name ?? '',
    icon: section?.icon ?? '',
    description: section?.description ?? '',
    servedFrom: section?.servedFrom ?? '',
    servedUntil: section?.servedUntil ?? '',
    isActive: section?.isActive ?? true,
    sortOrder: section?.sortOrder ?? 0,
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
      if (section) {
        result = await menuService.updateGroup(section.id, payload);
        toast.success('Section updated');
      } else {
        result = await menuService.createGroup(payload);
        toast.success('Section created');
      }
      onSave(result);
    } catch {
      toast.error(section ? 'Failed to update section' : 'Failed to create section');
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
          <p className="text-xs text-gray-500">Show this section on the public menu</p>
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
          {saving ? 'Saving...' : section ? 'Save Changes' : 'Create Section'}
        </button>
      </div>
    </form>
  );
}

// ─── Category Form ────────────────────────────────────────────────────────────

function CategoryForm({
  category,
  sections,
  onClose,
  onSave,
}: {
  category: Category | null;
  sections: MenuGroup[];
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
        <FieldRow label="Section">
          <select className={inputClass} value={form.menuGroupId ?? ''} onChange={(e) => set('menuGroupId', e.target.value)}>
            <option value="">No section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
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
  sections,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  categories: Category[];
  sections: MenuGroup[];
  onClose: () => void;
  onSave: (i: MenuItem) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price != null ? String(item.price) : '',
    currency: item?.currency ?? 'GBP',
    categoryId: item?.categoryId ?? '',
    imageUrl: item?.imageUrl ?? '',
    isAvailable: item?.isAvailable ?? true,
    isPopular: item?.isPopular ?? false,
    allergens: item?.allergens?.join(', ') ?? '',
    sortOrder: item?.sortOrder ?? 0,
  });
  const [selectedSectionId, setSelectedSectionId] = useState<string>(() => {
    if (item?.categoryId) {
      const cat = categories.find((c) => c.id === item.categoryId);
      return cat?.menuGroupId ?? '';
    }
    return '';
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const filteredCategories = selectedSectionId
    ? categories.filter((c) => c.menuGroupId === selectedSectionId)
    : categories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) { toast.error('Enter a valid price'); return; }
    setSaving(true);
    try {
      const payload: CreateMenuItemPayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        price: priceNum,
        currency: form.currency || undefined,
        categoryId: form.categoryId || undefined,
        imageUrl: form.imageUrl || undefined,
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
      <div className="grid grid-cols-2 gap-4">
        <FieldRow label="Section (filter)">
          <select
            className={inputClass}
            value={selectedSectionId}
            onChange={(e) => {
              setSelectedSectionId(e.target.value);
              set('categoryId', '');
            }}
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Category">
          <select className={inputClass} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">No category</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FieldRow>
      </div>
      <FieldRow label="Image URL">
        <input className={inputClass} value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..." />
      </FieldRow>
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
  const [sections, setSections] = useState<MenuGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sections' | 'categories' | 'items'>('sections');

  // Filter state
  const [filterSectionId, setFilterSectionId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');

  // Modal state
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<MenuGroup | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [secs, cats, menuItems] = await Promise.all([
        menuService.getGroups(),
        menuService.getCategories(),
        menuService.getItems(),
      ]);
      setSections(secs);
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
  const filteredCategories = filterSectionId
    ? categories.filter((c) => c.menuGroupId === filterSectionId)
    : categories;

  const filteredItems = items.filter((item) => {
    if (filterSectionId) {
      const cat = categories.find((c) => c.id === item.categoryId);
      if (!cat || cat.menuGroupId !== filterSectionId) return false;
    }
    if (filterCategoryId && item.categoryId !== filterCategoryId) return false;
    return true;
  });

  // ── Handlers ──

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section? Categories will become unassigned.')) return;
    setDeletingId(id);
    try {
      await menuService.deleteGroup(id);
      setSections((prev) => prev.filter((s) => s.id !== id));
      setCategories((prev) => prev.map((c) => c.menuGroupId === id ? { ...c, menuGroupId: null } : c));
      toast.success('Section deleted');
    } catch {
      toast.error('Failed to delete section');
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

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  };

  const getSectionName = (sectionId: string | null | undefined) => {
    if (!sectionId) return null;
    const s = sections.find((sec) => sec.id === sectionId);
    return s ? `${s.icon ?? ''} ${s.name}`.trim() : null;
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
            {sections.length} sections · {categories.length} categories · {items.length} items
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'sections' && (
            <button
              onClick={() => { setEditingSection(null); setShowSectionForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Section
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
        {(['sections', 'categories', 'items'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'sections' ? `Sections (${sections.length})` : tab === 'categories' ? `Categories (${categories.length})` : `Items (${items.length})`}
          </button>
        ))}
      </div>

      {/* ── Sections Tab ── */}
      {activeTab === 'sections' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {sections.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📋</div>
              <h3 className="font-semibold text-gray-700">No sections yet</h3>
              <p className="text-gray-500 text-sm mt-1">Create sections like Breakfast, Lunch, Dinner</p>
              <button
                onClick={() => { setEditingSection(null); setShowSectionForm(true); }}
                className="mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Section
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sections.map((section) => (
                <div key={section.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {section.icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{section.name}</span>
                      {!section.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {section.servedFrom && section.servedUntil && (
                      <p className="text-xs text-gray-500 mt-0.5">{section.servedFrom} – {section.servedUntil}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {section._count?.categories ?? 0} categories
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditingSection(section); setShowSectionForm(true); }}
                      className="text-gray-400 hover:text-gray-700 p-1.5 rounded transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      disabled={deletingId === section.id}
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
          {/* Section filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">Filter by section:</label>
            <select
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
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
                        {cat.menuGroupId && getSectionName(cat.menuGroupId) && (
                          <span className="ml-2 text-blue-500">· {getSectionName(cat.menuGroupId)}</span>
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
              value={filterSectionId}
              onChange={(e) => { setFilterSectionId(e.target.value); setFilterCategoryId(''); }}
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
            >
              <option value="">All categories</option>
              {(filterSectionId ? categories.filter((c) => c.menuGroupId === filterSectionId) : categories).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {(filterSectionId || filterCategoryId) && (
              <button
                onClick={() => { setFilterSectionId(''); setFilterCategoryId(''); }}
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
                  {filterSectionId || filterCategoryId ? 'Try adjusting the filters' : 'Add your first menu item'}
                </p>
                {!filterSectionId && !filterCategoryId && (
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
                        {item.categoryId && getCategoryName(item.categoryId) && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {getCategoryName(item.categoryId)}
                          </span>
                        )}
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
      {showSectionForm && (
        <Modal title={editingSection ? 'Edit Section' : 'Add Section'} onClose={() => { setShowSectionForm(false); setEditingSection(null); }}>
          <SectionForm
            section={editingSection}
            onClose={() => { setShowSectionForm(false); setEditingSection(null); }}
            onSave={(saved) => {
              if (editingSection) {
                setSections((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
              } else {
                setSections((prev) => [...prev, saved]);
              }
              setShowSectionForm(false);
              setEditingSection(null);
            }}
          />
        </Modal>
      )}

      {showCategoryForm && (
        <Modal title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={() => { setShowCategoryForm(false); setEditingCategory(null); }}>
          <CategoryForm
            category={editingCategory}
            sections={sections}
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
            sections={sections}
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
