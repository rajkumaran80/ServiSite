'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
import menuService from '../../../services/menu.service';
import uploadService from '../../../services/upload.service';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import type { MenuGroup, Category, MenuItem, CreateMenuGroupPayload, CreateCategoryPayload, CreateMenuItemPayload, ItemVariant } from '../../../types/menu.types';

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
  currency,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  categories: Category[];
  groups: MenuGroup[];
  currency: string;
  onClose: () => void;
  onSave: (i: MenuItem) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price != null ? String(item.price) : '',
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
        currency: currency || undefined,
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
      <FieldRow label="Price *">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium w-12 flex-shrink-0">{currency}</span>
          <input type="text" inputMode="decimal" className={inputClass} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="9.99" />
        </div>
      </FieldRow>

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

// ─── Item Variants Modal ─────────────────────────────────────────────────────

function VariantsModal({
  item,
  currency,
  onClose,
}: {
  item: MenuItem;
  currency: string;
  onClose: () => void;
}) {
  const [variants, setVariants] = useState<Array<{ name: string; price: string; isDefault: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    menuService.getVariants(item.id)
      .then((v) => setVariants(v.map((x) => ({ name: x.name, price: String(x.price), isDefault: x.isDefault }))))
      .catch(() => toast.error('Failed to load variants'))
      .finally(() => setIsLoading(false));
  }, [item.id]);

  const addVariant = () => setVariants((prev) => [...prev, { name: '', price: '', isDefault: prev.length === 0 }]);
  const removeVariant = (i: number) => setVariants((prev) => prev.filter((_, idx) => idx !== i));
  const updateVariant = (i: number, key: 'name' | 'price' | 'isDefault', value: any) => {
    setVariants((prev) =>
      prev.map((v, idx) =>
        idx === i
          ? { ...v, [key]: value }
          : key === 'isDefault' && value
          ? { ...v, isDefault: false }
          : v,
      ),
    );
  };

  const handleSave = async () => {
    const payload = variants.map((v, i) => ({
      name: v.name.trim(),
      price: parseFloat(v.price) || 0,
      isDefault: v.isDefault,
      sortOrder: i,
    })).filter((v) => v.name);

    setSaving(true);
    try {
      await menuService.saveVariants(item.id, payload);
      toast.success('Variants saved');
      onClose();
    } catch {
      toast.error('Failed to save variants');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Size Variants — ${item.name}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Add size variants (e.g. Small / Medium / Large). Each variant has its own price.
          When variants exist, the base item price is ignored — customers select a size first.
        </p>

        {isLoading ? (
          <div className="py-8 flex justify-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputClass + ' flex-1'}
                    placeholder="Size name (e.g. Small)"
                    value={v.name}
                    onChange={(e) => updateVariant(i, 'name', e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">{currency}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="9.99"
                      value={v.price}
                      onChange={(e) => updateVariant(i, 'price', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateVariant(i, 'isDefault', true)}
                    className={`text-xs px-2 py-1 rounded border transition-colors flex-shrink-0 ${v.isDefault ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-500 hover:border-blue-400'}`}
                    title="Set as default"
                  >
                    Default
                  </button>
                  <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 p-1 rounded flex-shrink-0">✕</button>
                </div>
              ))}
              {variants.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">No variants — item uses its base price.</p>
              )}
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="w-full border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 rounded-xl py-2 text-sm font-medium transition-colors"
            >
              + Add Size
            </button>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Variants'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── CSV Import Modal ────────────────────────────────────────────────────────

interface CsvRow { group: string; category: string; item: string; description: string; price: string; }
interface ParsedMenu {
  groups: string[];
  // groupName → categoryName[]
  categories: Map<string, string[]>;
  // categoryName → CsvRow[]
  items: Map<string, CsvRow[]>;
  totalItems: number;
}

function parseCsv(raw: string): { data: ParsedMenu | null; error: string | null } {
  const lines = raw.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { data: null, error: 'CSV must have a header row and at least one data row' };

  // Normalise header
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const required = ['group', 'category', 'item'];
  for (const col of required) {
    if (!header.includes(col)) return { data: null, error: `Missing required column: "${col}"` };
  }

  const idx = {
    group: header.indexOf('group'),
    category: header.indexOf('category'),
    item: header.indexOf('item'),
    description: header.indexOf('description'),
    price: header.indexOf('price'),
  };

  const result: ParsedMenu = { groups: [], categories: new Map(), items: new Map(), totalItems: 0 };
  const groupOrder: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    // RFC-4180 CSV parser
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur);
    const clean = (n: number) => (cols[n] ?? '').trim();

    const group = clean(idx.group);
    const category = clean(idx.category);
    const item = clean(idx.item);
    if (!group || !item) continue;

    if (!groupOrder.includes(group)) groupOrder.push(group);
    const cats = result.categories.get(group) ?? [];
    if (category && !cats.includes(category)) cats.push(category);
    result.categories.set(group, cats);

    const key = `${group}|||${category}`;
    const existing = result.items.get(key) ?? [];
    existing.push({
      group,
      category,
      item,
      description: idx.description >= 0 ? clean(idx.description) : '',
      price: idx.price >= 0 ? clean(idx.price) : '',
    });
    result.items.set(key, existing);
    result.totalItems++;
  }

  result.groups = groupOrder;
  return { data: result, error: null };
}

function ImportMenuModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState('');
  const [step, setStep] = useState<'paste' | 'confirm'>('paste');
  const [parsed, setParsed] = useState<ParsedMenu | null>(null);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleParse = () => {
    const { data, error } = parseCsv(csv);
    if (error) { setParseError(error); return; }
    setParsed(data!);
    setParseError('');
    setStep('confirm');
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    try {
      setProgress('Deleting existing menu data…');
      await menuService.deleteAll();

      // Create groups
      const groupMap = new Map<string, string>(); // groupName → id
      for (let i = 0; i < parsed.groups.length; i++) {
        const name = parsed.groups[i];
        setProgress(`Creating group ${i + 1}/${parsed.groups.length}: ${name}`);
        const g = await menuService.createGroup({ name, sortOrder: i, isActive: true });
        groupMap.set(name, g.id);
      }

      // Create categories
      const catMap = new Map<string, string>(); // `groupName|||catName` → id
      let catIdx = 0;
      for (const [groupName, cats] of Array.from(parsed.categories.entries())) {
        const menuGroupId = groupMap.get(groupName);
        for (let j = 0; j < cats.length; j++) {
          const catName = cats[j];
          setProgress(`Creating category: ${catName}`);
          const c = await menuService.createCategory({ name: catName, menuGroupId, sortOrder: catIdx++ });
          catMap.set(`${groupName}|||${catName}`, c.id);
        }
      }

      // Create items
      let itemIdx = 0;
      for (const [key, rows] of Array.from(parsed.items.entries())) {
        for (const row of rows) {
          setProgress(`Creating item ${++itemIdx}/${parsed.totalItems}: ${row.item}`);
          const price = parseFloat(row.price);
          const catId = catMap.get(key);
          await menuService.createItem({
            name: row.item,
            description: row.description || undefined,
            price: isNaN(price) ? 0 : price,
            categoryIds: catId ? [catId] : [],
            isAvailable: true,
            sortOrder: itemIdx,
          });
        }
      }

      toast.success(`Imported ${parsed.groups.length} groups, ${catMap.size} categories, ${parsed.totalItems} items`);
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed — please try again');
    } finally {
      setImporting(false);
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Import Menu from CSV</h2>
          {!importing && <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>}
        </div>
        <div className="px-6 py-5 space-y-4">
          {step === 'paste' && (
            <>
              <p className="text-sm text-gray-600">
                Paste a CSV with columns: <code className="bg-gray-100 px-1 rounded text-xs">group, category, item, description, price</code>
              </p>
              <p className="text-xs text-gray-400">The first row must be the header. All existing groups, categories, and items will be deleted before importing.</p>
              <textarea
                rows={12}
                className={inputClass + ' font-mono text-xs'}
                placeholder={"group,category,item,description,price\nBreakfast,Eggs,Full English,Two eggs bacon and toast,9.95"}
                value={csv}
                onChange={(e) => { setCsv(e.target.value); setParseError(''); }}
              />
              {parseError && <p className="text-sm text-red-600">{parseError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" onClick={handleParse} disabled={!csv.trim()} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">Preview Import</button>
              </div>
            </>
          )}

          {step === 'confirm' && parsed && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800">⚠️ This will permanently delete all existing menu data</p>
                <p className="text-xs text-amber-700 mt-1">All groups, categories, and items will be erased and replaced with the imported data. This cannot be undone.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-800">Import summary</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-2xl font-bold text-blue-600">{parsed.groups.length}</p>
                    <p className="text-xs text-gray-500">Groups</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-2xl font-bold text-blue-600">{Array.from(parsed.categories.values()).reduce((a, b) => a + b.length, 0)}</p>
                    <p className="text-xs text-gray-500">Categories</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-2xl font-bold text-blue-600">{parsed.totalItems}</p>
                    <p className="text-xs text-gray-500">Items</p>
                  </div>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto mt-2">
                  {parsed.groups.map((g) => (
                    <div key={g}>
                      <p className="text-xs font-medium text-gray-700">{g}</p>
                      {(parsed.categories.get(g) ?? []).map((c) => (
                        <p key={c} className="text-xs text-gray-500 pl-3">└ {c} ({(parsed.items.get(`${g}|||${c}`) ?? []).length} items)</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {importing ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-blue-600 font-medium text-center">{progress}</p>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep('paste')} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Back</button>
                  <button type="button" onClick={handleImport} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">Delete All & Import</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Menu Page ────────────────────────────────────────────────

export default function DashboardMenuPage() {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [currency, setCurrency] = useState<string>('GBP');
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
  const [variantItem, setVariantItem] = useState<MenuItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const loadData = async () => {
    try {
      const [grps, cats, menuItems, tenantRes] = await Promise.all([
        menuService.getGroups(),
        menuService.getCategories(),
        menuService.getItems(),
        api.get('/tenant/current'),
      ]);
      setGroups(grps);
      setCategories(cats);
      setItems(menuItems);
      setCurrency(tenantRes.data?.data?.currency ?? 'GBP');
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
          {groups.length === 0 && (
            <button
              onClick={async () => {
                if (!confirm('Load the default menu template for your business type?')) return;
                try {
                  await api.post('/menu/seed-template', { clearExisting: false });
                  await loadData();
                  toast.success('Template loaded — menu seeded');
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || 'Failed to load template');
                }
              }}
              className="flex items-center gap-1.5 border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              ✨ Load Template
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ↑ Import CSV
          </button>
          <Link href="/dashboard/menu/modifiers" className="flex items-center gap-1.5 border border-gray-300 hover:border-blue-400 text-gray-600 hover:text-blue-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Modifiers
          </Link>
          <Link href="/dashboard/menu/bundles" className="flex items-center gap-1.5 border border-gray-300 hover:border-orange-400 text-gray-600 hover:text-orange-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Bundles
          </Link>
          <Link href="/dashboard/menu/pricing" className="flex items-center gap-1.5 border border-gray-300 hover:border-green-400 text-gray-600 hover:text-green-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Pricing Rules
          </Link>
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
                        {menuService.formatPrice(item.price, currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                        onClick={() => setVariantItem(item)}
                        className="text-xs px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                        title="Manage size variants"
                      >
                        Sizes
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
            currency={currency}
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

      {variantItem && (
        <VariantsModal
          item={variantItem}
          currency={currency}
          onClose={() => setVariantItem(null)}
        />
      )}

      {showImportModal && (
        <ImportMenuModal
          onClose={() => setShowImportModal(false)}
          onDone={async () => {
            setShowImportModal(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
}
