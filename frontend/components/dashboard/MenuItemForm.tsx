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
  price: z
    .string()
    .min(1, 'Price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 9.99)'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
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

export const MenuItemForm: React.FC<MenuItemFormProps> = ({
  item,
  categories,
  onSave,
  onClose,
}) => {
  const isEditing = !!item;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    item?.categoryIds ?? [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price ? String(item.price) : '',
      imageUrl: item?.imageUrl || '',
      isAvailable: item?.isAvailable ?? true,
      isPopular: item?.isPopular ?? false,
      allergens: item?.allergens?.join(', ') || '',
      sortOrder: item?.sortOrder ?? 0,
    },
  });

  const imageUrl = watch('imageUrl');

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

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
        allergens: data.allergens
          ? data.allergens.split(',').map((a) => a.trim()).filter(Boolean)
          : [],
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
        <ImageUpload
          currentUrl={imageUrl}
          mediaType="menu"
          onUpload={(url) => setValue('imageUrl', url)}
          aspectRatio="free"
          maxSizeMB={5}
        />
      </div>

      {/* Name */}
      <Input
        label="Name *"
        placeholder="e.g. Full English Breakfast"
        error={errors.name?.message}
        {...register('name')}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          placeholder="Short description of this item..."
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Price */}
      <Input
        label="Price *"
        placeholder="9.99"
        type="text"
        inputMode="decimal"
        error={errors.price?.message}
        {...register('price')}
      />

      {/* Categories — multi-select checkbox list */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Categories
          {selectedCategoryIds.length > 0 && (
            <span className="ml-2 text-xs font-normal text-blue-600">
              {selectedCategoryIds.length} selected
            </span>
          )}
        </label>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No categories yet — create one first.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {categories.map((cat) => {
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

      {/* Allergens */}
      <Input
        label="Allergens"
        placeholder="gluten, dairy, eggs (comma-separated)"
        hint="Separate allergens with commas"
        {...register('allergens')}
      />

      {/* Sort order */}
      <Input
        label="Sort Order"
        type="number"
        min="0"
        hint="Lower numbers appear first"
        error={errors.sortOrder?.message}
        {...register('sortOrder')}
      />

      {/* Availability & Popular toggles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Available</p>
            <p className="text-xs text-gray-500">Show to customers</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" {...register('isAvailable')} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Popular</p>
            <p className="text-xs text-gray-500">Show badge</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" {...register('isPopular')} />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" className="flex-1" isLoading={isSubmitting}>
          {isEditing ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
};

export default MenuItemForm;
