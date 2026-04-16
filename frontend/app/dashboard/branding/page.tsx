'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/auth.store';
import tenantService from '../../../services/tenant.service';
import { api } from '../../../services/api';
import ImageUpload from '../../../components/ui/ImageUpload';
import MultiImageUpload from '../../../components/ui/MultiImageUpload';
import type { Tenant } from '../../../types/tenant.types';
import {
  getRecommendedTemplates,
  getAllTemplates,
  getPageTemplate,
  getBusinessPreset,
} from '../../../config/page-templates';
import { revalidateTenantCache } from '../settings/actions';

const brandingSchema = z.object({
  primaryColor: z.string().min(1),
  secondaryColor: z.string().min(1),
  fontFamily: z.string().min(1),
});
type BrandingForm = z.infer<typeof brandingSchema>;

const FONTS = ['Inter', 'Playfair Display', 'Montserrat', 'Quicksand', 'Roboto', 'Georgia', 'system-ui'];

type Tab = 'template' | 'banner' | 'logo' | 'colors';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'template', label: 'Template', icon: '🎨' },
  { id: 'banner',   label: 'Banner',   icon: '🖼️' },
  { id: 'logo',     label: 'Logo & Font', icon: '✏️' },
  { id: 'colors',   label: 'Colors',   icon: '🎭' },
];

export default function BrandingPage() {
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('template');

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('grande');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Media state
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [promoImageUrl, setPromoImageUrl] = useState('');
  const [isSavingMedia, setIsSavingMedia] = useState(false);


  const form = useForm<BrandingForm>({
    resolver: zodResolver(brandingSchema),
    defaultValues: { primaryColor: '#3B82F6', secondaryColor: '#1E40AF', fontFamily: 'Inter' },
  });

  useEffect(() => {
    if (!user?.tenantId) return;
    api.get<{ data: Tenant }>('/tenant/current').then((res) => {
      const t = res.data.data;
      if (!t) return;
      setTenant(t);
      const ts = t.themeSettings as any || {};
      setSelectedTemplate(ts.pageTemplate || 'grande');
      setLogoUrl(t.logo || '');
      const stored = ts.bannerImages;
      setBannerUrls(Array.isArray(stored) && stored.length ? stored : t.banner ? [t.banner] : []);
      setPromoImageUrl(ts.promoImageUrl || '');
      form.reset({
        primaryColor: ts.primaryColor || '#3B82F6',
        secondaryColor: ts.secondaryColor || '#1E40AF',
        fontFamily: ts.fontFamily || 'Inter',
      });
    }).catch(() => {
      toast.error('Failed to load branding data');
    }).finally(() => setIsLoading(false));
  }, [user?.tenantId, form]);

  const handleSaveTemplate = async (templateId: string) => {
    if (!tenant) return;
    setIsSavingTemplate(true);
    try {
      const tmpl = getPageTemplate(templateId);
      const preset = getBusinessPreset(tenant.type);
      const updated = await tenantService.update(tenant.id, {
        themeSettings: {
          pageTemplate: templateId,
          primaryColor: preset.primaryColor,
          secondaryColor: preset.secondaryColor,
          accentColor: preset.primaryColor,
          surfaceColor: tmpl.surfaceColor,
          fontFamily: tmpl.fontFamily,
        },
      });
      setTenant(updated);
      setSelectedTemplate(templateId);
      form.setValue('primaryColor', preset.primaryColor);
      form.setValue('secondaryColor', preset.secondaryColor);
      form.setValue('fontFamily', tmpl.fontFamily);
      await revalidateTenantCache(tenant.slug);
      toast.success(`"${tmpl.name}" applied`);
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveBrandingColors = async (data: BrandingForm) => {
    if (!tenant) return;
    setIsSavingMedia(true);
    try {
      const ts = tenant.themeSettings as any || {};
      const updated = await tenantService.update(tenant.id, {
        themeSettings: {
          ...ts,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily,
        },
      });
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      toast.success('Colors & font saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSavingMedia(false);
    }
  };

  const handleSaveMedia = async () => {
    if (!tenant) return;
    setIsSavingMedia(true);
    try {
      const ts = tenant.themeSettings as any || {};
      const updated = await tenantService.update(tenant.id, {
        logo: logoUrl || undefined,
        banner: bannerUrls[0] || undefined,
        themeSettings: {
          ...ts,
          bannerImages: bannerUrls,
          promoImageUrl: promoImageUrl || null,
        },
      });
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setIsSavingMedia(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
        <p className="text-gray-500 text-sm mt-1">Customise how your public website looks and feels</p>
      </div>

      {/* Sub-tab strip */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit flex-wrap">
        {TABS.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── TEMPLATE TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'template' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Page Template</h2>
            <p className="text-sm text-gray-500 mb-5">
              8 master layouts — each perfected for spacing, typography and shadows.
              Pick a structure; your brand colours and terminology apply automatically.
            </p>

            {(() => {
              const preset = getBusinessPreset(tenant?.type);
              const recommended = getRecommendedTemplates(tenant?.type);
              const all = getAllTemplates();
              const remaining = all.filter((t) => !recommended.find((r) => r.id === t.id));
              const shown = showAllTemplates ? all : recommended;

              return (
                <>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-4">
                    Recommended for {preset.label}
                  </p>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {shown.map((tmpl) => {
                      const isSelected = selectedTemplate === tmpl.id;
                      const isRec = recommended.some((r) => r.id === tmpl.id);
                      return (
                        <div
                          key={tmpl.id}
                          className={`rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-500 shadow-lg scale-[1.01]'
                              : 'border-transparent hover:border-gray-200 hover:shadow-md'
                          } ${isSavingTemplate ? 'opacity-60 pointer-events-none' : ''}`}
                          onClick={() => handleSaveTemplate(tmpl.id)}
                        >
                          {/* Preview swatch */}
                          <div className={`bg-gradient-to-br ${tmpl.previewGradient} p-4 h-28 flex flex-col justify-between relative overflow-hidden`}>
                            {isRec && !showAllTemplates && (
                              <div className="absolute top-2 right-2 bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                ✓ Rec
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className={`w-12 h-1.5 rounded ${['typographic', 'luxe', 'cozy'].includes(tmpl.heroStyle) ? 'bg-gray-800/50' : 'bg-white/40'}`} />
                              <div className="flex gap-1">
                                {[1,2,3].map(i => <div key={i} className={`w-6 h-1 rounded ${['typographic', 'luxe', 'cozy'].includes(tmpl.heroStyle) ? 'bg-gray-500/40' : 'bg-white/30'}`} />)}
                              </div>
                            </div>
                            <div>
                              {tmpl.heroStyle === 'luxe' ? (
                                <div>
                                  <div className="w-6 h-px mb-1.5" style={{ backgroundColor: tmpl.primaryColor }} />
                                  <div className="w-24 h-2.5 bg-gray-700/70 rounded mb-1" />
                                  <div className="w-8 h-px" style={{ backgroundColor: tmpl.primaryColor }} />
                                </div>
                              ) : tmpl.heroStyle === 'typographic' ? (
                                <div>
                                  <div className="w-28 h-3.5 bg-gray-800/80 rounded mb-1" />
                                  <div className="w-20 h-3.5 bg-gray-800/50 rounded mb-1.5" />
                                  <div className="w-8 h-0.5 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                                </div>
                              ) : tmpl.heroStyle === 'neon' ? (
                                <div>
                                  <div className="w-24 h-2.5 bg-white/90 rounded mb-1.5" style={{ boxShadow: `0 0 8px ${tmpl.primaryColor}` }} />
                                  <div className="w-14 h-0.5 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                                </div>
                              ) : tmpl.heroStyle === 'split' ? (
                                <div className="flex -mx-4 -mb-4 h-14 mt-1">
                                  <div className="flex-1 flex flex-col justify-center px-3" style={{ backgroundColor: tmpl.primaryColor }}>
                                    <div className="w-14 h-2 bg-white/80 rounded mb-1" />
                                    <div className="w-10 h-1.5 bg-white/50 rounded" />
                                  </div>
                                  <div className="w-2/5 bg-gray-400/40" />
                                </div>
                              ) : tmpl.heroStyle === 'cinematic' ? (
                                <div>
                                  <div className="h-1.5 bg-black/60 -mx-4 mb-1" />
                                  <div className="w-24 h-2.5 bg-white/90 rounded mb-1" />
                                  <div className="w-14 h-0.5 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                                  <div className="h-1.5 bg-black/60 -mx-4 mt-1" />
                                </div>
                              ) : tmpl.heroStyle === 'cozy' ? (
                                <div>
                                  <div className="w-16 h-1.5 rounded-full mb-1.5 opacity-60" style={{ backgroundColor: tmpl.primaryColor }} />
                                  <div className="w-24 h-2.5 bg-amber-900/60 rounded mb-1" />
                                  <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: tmpl.primaryColor }} />
                                </div>
                              ) : (
                                <div>
                                  <div className="w-20 h-2.5 bg-white/80 rounded mb-1" />
                                  <div className="w-14 h-1.5 bg-white/40 rounded" />
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Label */}
                          <div className="bg-white px-3 py-3 flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 text-sm">{tmpl.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{tmpl.tagline.split(' · ')[0]}</p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!showAllTemplates ? (
                    <button type="button" onClick={() => setShowAllTemplates(true)}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors">
                      Show {remaining.length} other template{remaining.length !== 1 ? 's' : ''} →
                    </button>
                  ) : (
                    <button type="button" onClick={() => setShowAllTemplates(false)}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors">
                      ← Show recommended only
                    </button>
                  )}
                </>
              );
            })()}
          </div>
          {isSavingTemplate && (
            <p className="text-sm text-blue-600 mt-3">Applying template…</p>
          )}
        </div>
      )}

      {/* ── BANNER TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'banner' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Hero Banner</h2>
              <p className="text-sm text-gray-500">
                Upload up to 5 images — they cycle as a slideshow behind your hero section.
              </p>
            </div>
            <MultiImageUpload
              urls={bannerUrls}
              onChange={(urls: string[]) => setBannerUrls(urls)}
            />

            <div className="border-t border-gray-100 pt-5">
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">Promo / Feature Image</h3>
              <p className="text-sm text-gray-500 mb-3">Optional image used in home page feature blocks and social sharing.</p>
              <ImageUpload
                currentUrl={promoImageUrl}
                mediaType="banner"
                onUpload={(url) => setPromoImageUrl(url)}
                aspectRatio="banner"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingMedia}
            onClick={handleSaveMedia}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingMedia && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Images
          </button>
        </div>
      )}

      {/* ── LOGO & FONT TAB ───────────────────────────────────────────────── */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Logo</h3>
              <p className="text-sm text-gray-500 mb-3">Shown in the navbar. Square images work best.</p>
              <ImageUpload
                currentUrl={logoUrl}
                mediaType="logo"
                onUpload={(url) => setLogoUrl(url)}
                aspectRatio="square"
              />
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="font-semibold text-gray-900 mb-1">Font Family</h3>
              <p className="text-sm text-gray-500 mb-3">
                Override the template's default font. Leave on template default for best results.
              </p>
              <select
                {...form.register('fontFamily')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingMedia}
            onClick={async () => {
              await handleSaveMedia();
              // Also persist font
              const data = form.getValues();
              if (!tenant) return;
              const ts = tenant.themeSettings as any || {};
              await tenantService.update(tenant.id, { themeSettings: { ...ts, fontFamily: data.fontFamily } });
              await revalidateTenantCache(tenant.slug);
            }}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingMedia && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Logo & Font
          </button>
        </div>
      )}

      {/* ── COLORS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'colors' && (
        <form onSubmit={form.handleSubmit(handleSaveBrandingColors)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 mb-1">Brand Colors</h2>
            <p className="text-sm text-gray-500">
              These override the template's default colours. Changing the template resets these to the industry preset.
            </p>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    {...form.register('primaryColor')}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={form.watch('primaryColor')}
                    onChange={(e) => form.setValue('primaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Used for buttons, links and accents</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    {...form.register('secondaryColor')}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={form.watch('secondaryColor')}
                    onChange={(e) => form.setValue('secondaryColor', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#1E40AF"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Used for hover states and gradients</p>
              </div>
            </div>

            {/* Live preview swatch */}
            <div className="rounded-xl overflow-hidden border border-gray-100 mt-2">
              <div className="h-12 flex items-center justify-between px-5"
                style={{ backgroundColor: form.watch('primaryColor') }}>
                <span className="text-white text-sm font-semibold">Preview navbar</span>
                <div className="flex gap-1.5">
                  {[1,2,3].map(i => <div key={i} className="w-10 h-1.5 bg-white/40 rounded" />)}
                </div>
              </div>
              <div className="h-16 flex items-center gap-3 px-5 bg-white border-t border-gray-100">
                <div className="px-4 py-1.5 rounded-lg text-white text-sm font-medium"
                  style={{ backgroundColor: form.watch('primaryColor') }}>
                  {getBusinessPreset(tenant?.type)?.ctaLabel || 'Book Now'}
                </div>
                <div className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                  style={{ color: form.watch('primaryColor'), borderColor: form.watch('primaryColor') + '40' }}>
                  Learn More
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingMedia}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingMedia && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Colors
          </button>
        </form>
      )}

    </div>
  );
}
