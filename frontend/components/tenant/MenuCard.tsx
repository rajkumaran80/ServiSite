import React from 'react';
import Image from 'next/image';
import type { MenuItem } from '../../types/menu.types';
import { menuService } from '../../services/menu.service';

interface MenuCardProps {
  item: MenuItem;
  currency?: string;
  primaryColor?: string;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, currency = 'GBP', primaryColor = '#3B82F6' }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row">
      {/* Image */}
      {item.imageUrl && (
        <div className="relative w-full sm:w-32 h-48 sm:h-auto flex-shrink-0">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 128px"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">{item.name}</h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.isPopular && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  Popular
                </span>
              )}
              {!item.isAvailable && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Unavailable
                </span>
              )}
            </div>
          </div>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-1 gap-2">
          <span
            className="text-lg font-bold"
            style={{ color: primaryColor }}
          >
            {menuService.formatPrice(Number(item.price), item.currency || currency)}
          </span>
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {item.allergens.slice(0, 3).map((allergen) => (
                <span
                  key={allergen}
                  className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
