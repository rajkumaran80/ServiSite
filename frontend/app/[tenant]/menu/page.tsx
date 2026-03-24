'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import type { FullMenu, MenuItem } from '../../../types/menu.types';

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
    if (!res.ok) return { groups: [], uncategorized: [] };
    const data = await res.json();
    return data.data;
  } catch { return { groups: [], uncategorized: [] }; }
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${suffix}`;
}

function formatPrice(price: number | string, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(typeof price === 'string' ? parseFloat(price) : price);
}

// ─── Item Detail Modal ────────────────────────────────────────────────────────

function ItemModal({ item, currency, onClose }: { item: MenuItem; currency: string; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 'min(560px, 95vw)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image — tall, not cropped */}
        <div className="relative flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full object-cover" style={{ maxHeight: '65vh' }} />
          ) : (
            <div className="w-full bg-gray-100 flex items-center justify-center text-7xl" style={{ height: '300px' }}>🍽️</div>
          )}
          {item.isPopular && (
            <span className="absolute top-3 left-3 bg-amber-400 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full">
              ⭐ Popular
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Content — compact strip below image */}
        <div className="overflow-y-auto px-5 py-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900 leading-snug">{item.name}</h2>
            <span className="text-base font-bold text-blue-700 flex-shrink-0">
              {formatPrice(item.price, currency)}
            </span>
          </div>

          {item.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
          )}

          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {item.allergens.map((allergen) => (
                <span
                  key={allergen}
                  className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full"
                >
                  {allergen}
                </span>
              ))}
            </div>
          )}

          {!item.isAvailable && (
            <p className="text-xs text-red-500 font-medium">Currently unavailable</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, currency, onClick }: { item: MenuItem; currency: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all text-left w-full"
    >
      {item.imageUrl ? (
        <div className="relative">
          <img src={item.imageUrl} alt={item.name} className="w-full h-44 object-cover" />
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
            {formatPrice(item.price, currency)}
          </span>
          {item.allergens && item.allergens.length > 0 && (
            <span className="text-xs text-gray-400">{item.allergens.length} allergen{item.allergens.length > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenant as string;

  const [tenant, setTenant] = useState<any>(null);
  const [menu, setMenu] = useState<FullMenu>({ groups: [], uncategorized: [] });
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    Promise.all([getTenant(tenantSlug), getFullMenu(tenantSlug)]).then(([t, m]) => {
      setTenant(t);
      setMenu(m);
      const groupParam = searchParams.get('group');
      const validGroup = groupParam && m.groups.some((g: any) => g.id === groupParam);
      setActiveTab(validGroup ? groupParam : (m.groups[0]?.id ?? ''));
      setLoading(false);
    });
  }, [tenantSlug]);

  // Switch tab when ?group= param changes (e.g. clicking navbar pill again)
  useEffect(() => {
    const groupParam = searchParams.get('group');
    if (groupParam && menu.groups.some((g: any) => g.id === groupParam)) {
      setActiveTab(groupParam);
    }
  }, [searchParams]);

  const openItem = useCallback((item: MenuItem) => setSelectedItem(item), []);
  const closeItem = useCallback(() => setSelectedItem(null), []);

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

  const currency = tenant.currency || 'GBP';
  const isRestaurant = tenant.type === 'RESTAURANT';
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';
  const activeSection = menu.groups.find((s) => s.id === activeTab);
  const hasContent =
    menu.groups.some((s) => s.categories?.some((c) => c.menuItems && c.menuItems.length > 0)) ||
    menu.uncategorized.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div
        className="py-16 px-6 text-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor}ee, ${primaryColor}99)` }}
      >
        <div className="text-5xl mb-4">{isRestaurant ? '🍽️' : '🛠️'}</div>
        <h1 className="text-4xl font-bold text-white mb-2">
          {isRestaurant ? 'Our Menu' : 'Our Services'}
        </h1>
        <p className="text-white/75 text-lg">{tenant.name}</p>
      </div>

      {/* Group Tab Bar */}
      {menu.groups.length > 0 && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center gap-1 overflow-x-auto py-2 scrollbar-none">
              {menu.groups.map((group) => {
                const isActive = activeTab === group.id;
                return (
                  <button
                    key={group.id}
                    onClick={() => setActiveTab(group.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}55` } : {}}
                  >
                    {group.icon && <span className="text-base leading-none">{group.icon}</span>}
                    {group.name}
                  </button>
                );
              })}
              {menu.uncategorized.length > 0 && (
                <button
                  onClick={() => setActiveTab('uncategorized')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === 'uncategorized' ? 'text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={activeTab === 'uncategorized' ? { backgroundColor: primaryColor, boxShadow: `0 2px 8px ${primaryColor}55` } : {}}
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
            {activeSection && (
              <div>
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-1">
                    {activeSection.icon && <span className="text-3xl">{activeSection.icon}</span>}
                    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                      {activeSection.name}
                    </h2>
                  </div>
                  {activeSection.servedFrom && activeSection.servedUntil && (
                    <p className="text-sm text-gray-500 mt-1">
                      Served {formatTime(activeSection.servedFrom)} – {formatTime(activeSection.servedUntil)}
                    </p>
                  )}
                  {activeSection.description && (
                    <p className="text-gray-600 mt-2">{activeSection.description}</p>
                  )}
                </div>

                <div className="space-y-12">
                  {activeSection.categories?.map((category) => {
                    if (!category.menuItems?.length) return null;
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
                            <ItemCard key={item.id} item={item} currency={currency} onClick={() => openItem(item)} />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'uncategorized' && menu.uncategorized.length > 0 && (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Other Items</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {menu.uncategorized.map((item) => (
                    <ItemCard key={item.id} item={item} currency={currency} onClick={() => openItem(item)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemModal item={selectedItem} currency={currency} onClose={closeItem} />
      )}
    </div>
  );
}
