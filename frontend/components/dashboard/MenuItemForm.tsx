'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ImageUpload } from '../ui/ImageUpload';
import type { MenuItem, Category } from '../../types/menu.types';
import { menuService } from '../../services/menu.service';

const menuItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(500).optional(),
  price: z.string().min(1, 'Price is required').regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 9.99)'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isChefSpecial: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  stock: z.string().optional(),
  batch: z.string().optional(),
  allergens: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  item?: MenuItem | null;
  categories: Category[];
  onSave: (item: MenuItem) => void;
  onClose: () => void;
}

const BATCHES = [1, 2, 3, 4, 5, 6];

function Toggle({ label, sub, color, checked, onChange }: { label: string; sub: string; color: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${checked ? color : 'bg-gray-200'}`}
        style={checked ? { backgroundColor: undefined } : undefined}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export const MenuItemForm: React.FC<MenuItemFormProps> = ({ item, categories, onSave, onClose }) => {
  const isEditing = !!item;
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(item?.categoryIds ?? []);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price ? String(item.price) : '',
      imageUrl: item?.imageUrl || '',
      isAvailable: item?.isAvailable ?? true,
      isPopular: item?.isPopular ?? false,
      isNew: item?.isNew ?? false,
      isChefSpecial: item?.isChefSpecial ?? false,
      isSpicy: item?.isSpicy ?? false,
      isVegan: item?.isVegan ?? false,
      isGlutenFree: item?.isGlutenFree ?? false,
      stock: item?.stock != null ? String(item.stock) : '',
      batch: item?.batch != null ? String(item.batch) : '',
      allergens: item?.allergens?.join(', ') || '',
      sortOrder: item?.sortOrder ?? 0,
    },
  });

  const watched = watch(['isAvailable', 'isPopular', 'isNew', 'isChefSpecial', 'isSpicy', 'isVegan', 'isGlutenFree', 'imageUrl', 'batch']);
  const [isAvailable, isPopular, isNew, isChefSpecial, isSpicy, isVegan, isGlutenFree, imageUrl, batchVal] = watched;

  const toggleCategory = (id: string) =>
    setSelectedCategoryIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const onSubmit = async (data: MenuItemFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        price: parseFloat(data.price),
        categoryIds: selectedCategoryIds,
        imageUrl: data.imageUrl || undefined,
        isAvailable: data.isAvailable,
        isPopular: data.isPopular,
        isNew: data.isNew,
        isChefSpecial: data.isChefSpecial,
        isSpicy: data.isSpicy,
        isVegan: data.isVegan,
        isGlutenFree: data.isGlutenFree,
        stock: data.stock !== '' && data.stock != null ? parseInt(data.stock) : null,
        batch: data.batch !== '' && data.batch != null ? parseInt(data.batch) : null,
        allergens: data.allergens ? data.allergens.split(',').map(a => a.trim()).filter(Boolean) : [],
        sortOrder: data.sortOrder,
      };

      let result: MenuItem;
      if (isEditing && item) {
        result = await menuService.updateItem(item.id, payload);
        toast.success('Item updated');
      } else {
        result = await menuService.createItem(payload);
        toast.success('Item added');
      }
      onSave(result);
    } catch {
      toast.error(isEditing ? 'Failed to update item' : 'Failed to create item');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
        <ImageUpload currentUrl={imageUrl} mediaType="menu" onUpload={url => setValue('imageUrl', url)} aspectRatio="free" maxSizeMB={5} />
      </div>

      <Input label="Name *" placeholder="e.g. Full English Breakfast" error={errors.name?.message} {...register('name')} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={3} placeholder="Short description..." className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" {...register('description')} />
      </div>

      <Input label="Price *" placeholder="9.99" type="text" inputMode="decimal" error={errors.price?.message} {...register('price')} />

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories
          {selectedCategoryIds.length > 0 && <span className="ml-2 text-xs font-normal text-blue-600">{selectedCategoryIds.length} selected</span>}
        </label>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {categories.map(cat => {
              const checked = selectedCategoryIds.includes(cat.id);
              return (
                <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-colors ${checked ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
        <p className="text-xs text-gray-500 mb-2">Group items into up to 6 batches (e.g. served in courses, or display order)</p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => setValue('batch', '')}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${!batchVal ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            None
          </button>
          {BATCHES.map(n => (
            <button key={n} type="button" onClick={() => setValue('batch', String(n))}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${batchVal === String(n) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              Batch {n}
            </button>
          ))}
        </div>
        <input type="hidden" {...register('batch')} />
      </div>

      {/* Marketing badge — mutually exclusive */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Marketing Badge <span className="font-normal text-gray-400">(pick one)</span></label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'isChefSpecial', label: "Chef's Special", color: '#FFD700', emoji: '👨‍🍳' },
            { key: 'isNew',         label: 'New',            color: '#007AFF', emoji: '⭐' },
            { key: 'isPopular',     label: 'Popular',        color: '#FF9500', emoji: '🔥' },
          ].map(({ key, label, color, emoji }) => {
            const active = key === 'isChefSpecial' ? isChefSpecial : key === 'isNew' ? isNew : isPopular;
            return (
              <button key={key} type="button"
                onClick={() => {
                  setValue('isChefSpecial', key === 'isChefSpecial' ? !isChefSpecial : false);
                  setValue('isNew', key === 'isNew' ? !isNew : false);
                  setValue('isPopular', key === 'isPopular' ? !isPopular : false);
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${active ? 'border-transparent ring-2 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
                style={active ? { backgroundColor: color, borderColor: color } : undefined}>
                <span className="text-lg">{emoji}</span>
                <span className="text-xs font-semibold leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </div>
        <input type="hidden" {...register('isPopular')} />
        <input type="hidden" {...register('isNew')} />
        <input type="hidden" {...register('isChefSpecial')} />
      </div>

      {/* Dietary traits */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Traits</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'isSpicy',      label: 'Spicy',        emoji: '🌶️', active: isSpicy },
            { key: 'isVegan',      label: 'Vegan',        emoji: '🌿', active: isVegan },
            { key: 'isGlutenFree', label: 'Gluten-Free',  emoji: '🌾', active: isGlutenFree },
          ].map(({ key, label, emoji, active }) => (
            <button key={key} type="button"
              onClick={() => setValue(key as any, !active)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${active ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
              <span className="text-lg">{emoji}</span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
        <input type="hidden" {...register('isSpicy')} />
        <input type="hidden" {...register('isVegan')} />
        <input type="hidden" {...register('isGlutenFree')} />
      </div>

      {/* Stock */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
        <input
          type="number" min="0"
          placeholder="Leave blank for unlimited"
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('stock')}
        />
        <p className="mt-1 text-xs text-gray-400">Set to 0 to mark item as Sold Out</p>
      </div>

      {/* Allergens + Sort Order */}
      <Input label="Allergens" placeholder="gluten, dairy, eggs (comma-separated)" hint="Separate allergens with commas" {...register('allergens')} />
      <Input label="Sort Order" type="number" min="0" hint="Lower numbers appear first" error={errors.sortOrder?.message} {...register('sortOrder')} />

      {/* Availability toggle */}
      <Toggle label="Available" sub="Show to customers" color="bg-blue-600" checked={!!isAvailable} onChange={v => setValue('isAvailable', v)} />
      <input type="hidden" {...register('isAvailable')} />

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>{isEditing ? 'Save Changes' : 'Add Item'}</Button>
      </div>
    </form>
  );
};

export default MenuItemForm;
