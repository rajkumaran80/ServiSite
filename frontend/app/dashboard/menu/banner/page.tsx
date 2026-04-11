'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';
import { ImageUpload } from '../../../../components/ui/ImageUpload';
import { VideoUpload } from '../../../../components/ui/VideoUpload';

export default function MenuBannerPage() {
  const [tenantId, setTenantId] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerVideoUrl, setBannerVideoUrl] = useState('');
  const [bannerType, setBannerType] = useState<'image' | 'video'>('image');
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/tenant/current').then((res) => {
      const tenant = res.data.data;
      const theme = tenant.themeSettings || {};
      setTenantId(tenant.id);
      setBannerImageUrl(theme.menuBannerImageUrl || '');
      setBannerVideoUrl(theme.menuVideoUrl || '');
      setBannerType(theme.menuBannerType || 'image');
    }).catch(() => {
      toast.error('Failed to load settings');
    }).finally(() => setIsLoading(false));
  }, []);

  const save = async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.put(`/tenant/${tenantId}`, { themeSettings: updates });
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (type: 'image' | 'video') => {
    setBannerType(type);
    save({ menuBannerType: type });
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
        <h1 className="text-2xl font-bold text-gray-900">Menu Banner</h1>
        <p className="text-gray-500 text-sm mt-1">Image or video shown at the top of your menu page</p>
      </div>

      {/* Type toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Display type</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleTypeChange('image')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                bannerType === 'image'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              🖼️ Image
            </button>
            <button
              onClick={() => handleTypeChange('video')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                bannerType === 'video'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              🎬 Video
            </button>
          </div>
        </div>

        {bannerType === 'image' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Banner Image</p>
            <p className="text-xs text-gray-400 mb-3">Shown at the top of your menu page. Recommended: 1600×600px or wider.</p>
            <ImageUpload
              currentUrl={bannerImageUrl}
              mediaType="banner"
              onUpload={(url) => {
                setBannerImageUrl(url);
                save({ menuBannerImageUrl: url, menuBannerType: 'image' });
              }}
              aspectRatio="banner"
            />
            {bannerImageUrl && (
              <button
                onClick={() => {
                  setBannerImageUrl('');
                  save({ menuBannerImageUrl: '', menuBannerType: 'image' });
                }}
                className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Remove image
              </button>
            )}
          </div>
        )}

        {bannerType === 'video' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Banner Video</p>
            <p className="text-xs text-gray-400 mb-3">Autoplays muted at the top of your menu page. MP4, WebM or MOV · Max 200MB.</p>
            <VideoUpload
              currentUrl={bannerVideoUrl}
              onUpload={(url) => {
                setBannerVideoUrl(url);
                save({ menuVideoUrl: url, menuBannerType: 'video' });
              }}
              onClear={() => {
                setBannerVideoUrl('');
                save({ menuVideoUrl: '', menuBannerType: 'video' });
              }}
            />
          </div>
        )}
      </div>

      {saving && (
        <p className="text-xs text-center text-blue-500">Saving…</p>
      )}
      <p className="text-xs text-gray-400 text-center">Changes take effect immediately on your website</p>
    </div>
  );
}
