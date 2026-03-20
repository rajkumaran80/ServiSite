'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { FullMenu, MenuGroup, MenuItem } from '../../../types/menu.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, { next: { revalidate: 300 } } as RequestInit);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch { return null; }
}

async function getFullMenu(slug: string): Promise<FullMenu> {
  try {
    const res = await fetch(`${API_URL}/menu/full`, {
      next: { revalidate: 60 },
      headers: { 'X-Tenant-ID': slug },
    } as RequestInit);
    if (!res.ok) return { sections: [], uncategorized: [] };
    const data = await res.json();
    return data.data;
  } catch { return { sections: [], uncategorized: [] }; }
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${suffix}`;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

function ItemCard({ item, currency }: { item: MenuItem; currency: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {item.imageUrl ? (
        <div className="relative">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-44 object-cover"
          />
          {item.isPopular && (
            <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">
              Popular
            </span>
          )}
        </div>
      ) : (
        <div className="relative w-full h-44 bg-gray-100 flex items-center justify-center text-4xl">
          🍽️
          {item.isPopular && (
            <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full">
              Popular
            </span>
          )}
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">{item.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-base font-bold text-blue-700">
            {formatPrice(typeof item.price === 'string' ? parseFloat(item.price) : item.price, currency)}
          </span>
        </div>
        {item.allergens && item.allergens.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.allergens.map((allergen) => (
              <span
                key={allergen}
                className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded"
              >
                {allergen}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MenuPage() {
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [tenant, setTenant] = useState<any>(null);
  const [menu, setMenu] = useState<FullMenu>({ sections: [], uncategorized: [] });
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantSlug) return;
    Promise.all([getTenant(tenantSlug), getFullMenu(tenantSlug)]).then(([t, m]) => {
      setTenant(t);
      setMenu(m);
      if (m.sections && m.sections.length > 0) {
        setActiveTab(m.sections[0].id);
      }
      setLoading(false);
    });
  }, [tenantSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-3xl px-4">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">404</div>
          <p className="text-gray-600">Restaurant not found</p>
        </div>
      </div>
    );
  }

  const isRestaurant = tenant.type === 'RESTAURANT';
  const activeSection = menu.sections.find((s) => s.id === activeTab);
  const hasContent =
    (menu.sections && menu.sections.some((s) => s.categories && s.categories.some((c) => c.menuItems && c.menuItems.length > 0))) ||
    menu.uncategorized.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {isRestaurant ? 'Our Menu' : 'Our Services'}
          </h1>
          <p className="text-gray-500 mt-2">
            {tenant.name}
            {isRestaurant ? ' · Classic British Dining Experience' : ''}
          </p>
        </div>
      </div>

      {/* Section Tab Bar */}
      {menu.sections.length > 0 && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
              {menu.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === section.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {section.icon && <span className="text-base leading-none">{section.icon}</span>}
                  {section.name}
                </button>
              ))}
              {menu.uncategorized.length > 0 && (
                <button
                  onClick={() => setActiveTab('uncategorized')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTab === 'uncategorized'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  Other
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!hasContent ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">{isRestaurant ? '🍽️' : '🛠️'}</div>
            <h2 className="text-xl font-semibold text-gray-700">No items yet</h2>
            <p className="text-gray-500 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div>
            {/* Active Section Content */}
            {activeSection && (
              <div>
                {/* Section Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-1">
                    {activeSection.icon && (
                      <span className="text-3xl">{activeSection.icon}</span>
                    )}
                    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                      {activeSection.name}
                    </h2>
                  </div>
                  {activeSection.servedFrom && activeSection.servedUntil && (
                    <p className="text-sm text-gray-500 ml-0 mt-1">
                      Served {formatTime(activeSection.servedFrom)} – {formatTime(activeSection.servedUntil)}
                    </p>
                  )}
                  {activeSection.description && (
                    <p className="text-gray-600 mt-2">{activeSection.description}</p>
                  )}
                </div>

                {/* Categories */}
                <div className="space-y-12">
                  {activeSection.categories && activeSection.categories.map((category) => {
                    if (!category.menuItems || category.menuItems.length === 0) return null;
                    return (
                      <section key={category.id}>
                        <div className="mb-5">
                          <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{category.description}</p>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {category.menuItems.map((item) => (
                            <ItemCard key={item.id} item={item} currency={tenant.currency || 'GBP'} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Uncategorized items */}
            {activeTab === 'uncategorized' && menu.uncategorized.length > 0 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Other Items</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {menu.uncategorized.map((item) => (
                    <ItemCard key={item.id} item={item} currency={tenant.currency || 'GBP'} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
