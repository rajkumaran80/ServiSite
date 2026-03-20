'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Category, MenuGroup } from '../../types/menu.types';
import { menuService } from '../../services/menu.service';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  description: z.string().max(300).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  menuGroupId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: Category | null;
  sections?: MenuGroup[];
  onSave: (category: Category) => void;
  onClose: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  sections = [],
  onSave,
  onClose,
}) => {
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      sortOrder: category?.sortOrder ?? 0,
      menuGroupId: category?.menuGroupId || '',
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        sortOrder: data.sortOrder,
        menuGroupId: data.menuGroupId || undefined,
      };

      let result: Category;
      if (isEditing && category) {
        result = await menuService.updateCategory(category.id, payload);
        toast.success('Category updated');
      } else {
        result = await menuService.createCategory(payload);
        toast.success('Category created');
      }
      onSave(result);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update category' : 'Failed to create category');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <Input
        label="Category Name *"
        placeholder="e.g. Starters, Main Course, Desserts"
        error={errors.name?.message}
        autoFocus
        {...register('name')}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="Brief description for this category..."
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          {...register('description')}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Section assignment */}
      {sections.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            {...register('menuGroupId')}
          >
            <option value="">No section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon ? `${s.icon} ` : ''}{s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sort order */}
      <Input
        label="Sort Order"
        type="number"
        min="0"
        hint="Lower numbers appear first"
        error={errors.sortOrder?.message}
        {...register('sortOrder')}
      />

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
          {isEditing ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;
