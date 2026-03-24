'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../services/api';
import { PREDEFINED_PAGES, resolveNavPages } from '../../../config/predefined-pages';

export default function NavigationPage() {
  const router = useRouter();
  const [navPages, setNavPages] = useState<Record<string, boolean>>({});
  const [tenantId, setTenantId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/tenant/current');
        const tenant = res.data.data;
        setTenantId(tenant.id);
        const stored = tenant.themeSettings?.navPages as Record<string, boolean> | undefined;
        setNavPages(resolveNavPages(stored));
      } catch {
        toast.error('Failed to load navigation settings');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const toggle = async (key: string, enabled: boolean) => {
    const updated = { ...navPages, [key]: enabled };
    setNavPages(updated);
    setSaving(key);
    try {
      await api.put(`/tenant/${tenantId}`, {
        themeSettings: { navPages: updated },
      });
    } catch {
      // Revert on failure
      setNavPages((prev) => ({ ...prev, [key]: !enabled }));
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Navigation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Choose which pages appear in your website's navigation menu
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {PREDEFINED_PAGES.map((page) => {
          const isEnabled = navPages[page.key] ?? page.defaultEnabled;
          const isSaving = saving === page.key;

          return (
            <div key={page.key} className="flex items-center gap-4 px-5 py-4">
              {/* Icon + info */}
              <div className="text-2xl w-10 text-center flex-shrink-0">{page.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{page.label}</span>
                  {page.alwaysOn && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">always on</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{page.description}</p>
              </div>

              {/* Manage entries button for non-built-in pages */}
              {!page.builtIn && (
                <button
                  onClick={() => router.push(`/dashboard/content/${page.key}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Manage
                </button>
              )}

              {/* Toggle */}
              <div className="flex-shrink-0">
                {page.alwaysOn ? (
                  <div className="w-11 h-6 bg-blue-500 rounded-full opacity-50 cursor-not-allowed" />
                ) : (
                  <button
                    onClick={() => toggle(page.key, !isEnabled)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    } ${isSaving ? 'opacity-60' : ''}`}
                    aria-label={isEnabled ? `Disable ${page.label}` : `Enable ${page.label}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Changes take effect immediately on your website
      </p>
    </div>
  );
}
