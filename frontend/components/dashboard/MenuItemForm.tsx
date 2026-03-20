'use client';

import React from 'react';
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
  categoryId: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  allergens: z.string().optional(), // comma-separated
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
      categoryId: item?.categoryId || '',
      imageUrl: item?.imageUrl || '',
      isAvailable: item?.isAvailable ?? true,
      isPopular: item?.isPopular ?? false,
      allergens: item?.allergens?.join(', ') || '',
      sortOrder: item?.sortOrder ?? 0,
    },
  });

  const imageUrl = watch('imageUrl');

  const onSubmit = async (data: MenuItemFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        price: parseFloat(data.price),
        categoryId: data.categoryId || undefined,
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
    } catch (error) {
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
        placeholder="e.g. Margherita Pizza"
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

      {/* Price & Category row */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price *"
          placeholder="9.99"
          type="text"
          inputMode="decimal"
          error={errors.price?.message}
          {...register('price')}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            {...register('categoryId')}
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
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
            <input
              type="checkbox"
              className="sr-only peer"
              {...register('isAvailable')}
            />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-gray-900">Popular</p>
            <p className="text-xs text-gray-500">Show badge</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              {...register('isPopular')}
            />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          isLoading={isSubmitting}
        >
          {isEditing ? 'Save Changes' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
};

export default MenuItemForm;
