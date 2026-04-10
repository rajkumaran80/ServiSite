'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';

const SECTIONS = [
  {
    key: 'showAboutOnHome',
    label: 'About Us snippet',
    desc: 'Short intro from your About Us page shown below featured items',
    manageKey: 'about',
  },
  {
    key: 'showReviewsOnHome',
    label: 'Google Reviews',
    desc: 'Pull and display your Google reviews automatically (requires Google Place ID in Settings)',
    manageKey: null,
  },
];

export default function HomeManagePage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [sections, setSections] = useState<Record<string, boolean>>({
    showAboutOnHome: true,
    showReviewsOnHome: true,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/tenant/current').then((res) => {
      const tenant = res.data.data;
      setTenantId(tenant.id);
      setSections({
        showAboutOnHome: tenant.themeSettings?.showAboutOnHome !== false,
        showReviewsOnHome: tenant.themeSettings?.showReviewsOnHome !== false,
      });
    }).catch(() => {
      toast.error('Failed to load settings');
    }).finally(() => setIsLoading(false));
  }, []);

  const toggle = async (key: string, enabled: boolean) => {
    setSections((prev) => ({ ...prev, [key]: enabled }));
    setSaving(key);
    try {
      await api.put(`/tenant/${tenantId}`, {
        themeSettings: { [key]: enabled },
      });
    } catch {
      setSections((prev) => ({ ...prev, [key]: !enabled }));
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Home Page</h1>
        <p className="text-gray-500 text-sm mt-1">Control which sections appear on your home page</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {SECTIONS.map(({ key, label, desc, manageKey }) => {
          const isEnabled = sections[key];
          const isSaving = saving === key;
          return (
            <div key={key} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900">{label}</span>
                <p className="text-sm text-gray-400 mt-0.5">{desc}</p>
              </div>
              {manageKey && (
                <button
                  onClick={() => router.push(`/dashboard/content/${manageKey}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Manage
                </button>
              )}
              <button
                onClick={() => toggle(key, !isEnabled)}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-shrink-0 ${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${isSaving ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">Changes take effect immediately on your website</p>
    </div>
  );
}
