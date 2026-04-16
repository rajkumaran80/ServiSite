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
  resolveDesignTokens,
  type DesignTokens,
} from '../../../config/page-templates';
import { revalidateTenantCache } from '../settings/actions';

const brandingSchema = z.object({
  primaryColor: z.string().min(1),
  secondaryColor: z.string().min(1),
  fontFamily: z.string().min(1),
});
type BrandingForm = z.infer<typeof brandingSchema>;

const FONTS = ['Inter', 'Playfair Display', 'Montserrat', 'Quicksand', 'Roboto', 'Georgia', 'system-ui'];

interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
}

const COLOR_PALETTES: ColorPalette[] = [
  { name: 'Ocean Blue',    primary: '#1D4ED8', secondary: '#1E40AF' },
  { name: 'Sky',           primary: '#0EA5E9', secondary: '#0284C7' },
  { name: 'Midnight',      primary: '#1E293B', secondary: '#0F172A' },
  { name: 'Emerald',       primary: '#059669', secondary: '#047857' },
  { name: 'Forest',        primary: '#166534', secondary: '#14532D' },
  { name: 'Sage',          primary: '#4ADE80', secondary: '#16A34A' },
  { name: 'Crimson',       primary: '#DC2626', secondary: '#991B1B' },
  { name: 'Rose',          primary: '#E11D48', secondary: '#BE123C' },
  { name: 'Coral',         primary: '#F97316', secondary: '#EA580C' },
  { name: 'Amber',         primary: '#D97706', secondary: '#B45309' },
  { name: 'Gold',          primary: '#C4A35A', secondary: '#A0843E' },
  { name: 'Bronze',        primary: '#BE8A60', secondary: '#A0714A' },
  { name: 'Purple',        primary: '#7C3AED', secondary: '#6D28D9' },
  { name: 'Violet',        primary: '#A855F7', secondary: '#7C3AED' },
  { name: 'Pink',          primary: '#EC4899', secondary: '#DB2777' },
  { name: 'Teal',          primary: '#0D9488', secondary: '#0F766E' },
  { name: 'Slate',         primary: '#475569', secondary: '#334155' },
  { name: 'Charcoal',      primary: '#374151', secondary: '#1F2937' },
  { name: 'Warm Brown',    primary: '#92400E', secondary: '#78350F' },
  { name: 'Near Black',    primary: '#09090B', secondary: '#27272A' },
];

type Tab = 'template' | 'banner' | 'logo' | 'colors' | 'style';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'template', label: 'Template',   icon: '🎨' },
  { id: 'banner',   label: 'Banner',     icon: '🖼️' },
  { id: 'logo',     label: 'Logo & Font', icon: '✏️' },
  { id: 'colors',   label: 'Colors',     icon: '🎭' },
  { id: 'style',    label: 'Style',      icon: '✦' },
];

const RADIUS_OPTIONS = [
  { label: 'Sharp',   value: '0px' },
  { label: 'Soft',    value: '8px' },
  { label: 'Rounded', value: '16px' },
  { label: 'Pill',    value: '24px' },
];

const TYPOGRAPHY_STYLES = [
  {
    id: 'elegant',
    label: 'Elegant',
    tagline: 'Fine dining & steakhouse',
    font: 'Playfair Display',
    preview: 'La Maison',
    style: { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic' as const },
  },
  {
    id: 'modern',
    label: 'Modern',
    tagline: 'Trendy café & brunch',
    font: 'Montserrat',
    preview: 'Urban Grind',
    style: { fontFamily: "'Montserrat', system-ui, sans-serif", fontWeight: 800 },
  },
  {
    id: 'cozy',
    label: 'Cozy',
    tagline: 'Local bakery & coffee shop',
    font: 'Quicksand',
    preview: 'The Corner Bake',
    style: { fontFamily: "'Quicksand', system-ui, sans-serif", fontWeight: 600 },
  },
  {
    id: 'classic',
    label: 'Classic',
    tagline: 'Traditional & timeless',
    font: 'Georgia',
    preview: 'The Old Tavern',
    style: { fontFamily: "Georgia, serif" },
  },
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

  // Design token state
  const [designTokens, setDesignTokens] = useState<DesignTokens>({ radius: '16px', glassEffect: false });
  const [fontStyle, setFontStyle] = useState<string>('modern');
  const [isSavingStyle, setIsSavingStyle] = useState(false);

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
      setDesignTokens(resolveDesignTokens(ts.pageTemplate, ts.designTokens));
      setFontStyle(ts.fontStyle || 'modern');
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

  const handleSaveStyle = async () => {
    if (!tenant) return;
    setIsSavingStyle(true);
    try {
      const ts = tenant.themeSettings as any || {};
      const selectedTypo = TYPOGRAPHY_STYLES.find((t) => t.id === fontStyle);
      const updated = await tenantService.update(tenant.id, {
        themeSettings: {
          ...ts,
          designTokens,
          fontStyle,
          fontFamily: selectedTypo?.font || ts.fontFamily,
        },
      });
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      toast.success('Style saved');
    } catch {
      toast.error('Failed to save style');
    } finally {
      setIsSavingStyle(false);
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
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Brand Colour</h2>
              <p className="text-sm text-gray-500">
                Pick a palette — it sets your primary and accent colours automatically. Changing the template resets this to the industry default.
              </p>
            </div>

            {/* Palette grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {COLOR_PALETTES.map((palette) => {
                const isSelected = form.watch('primaryColor').toLowerCase() === palette.primary.toLowerCase();
                return (
                  <button
                    key={palette.primary}
                    type="button"
                    title={palette.name}
                    onClick={() => {
                      form.setValue('primaryColor', palette.primary);
                      form.setValue('secondaryColor', palette.secondary);
                    }}
                    className={`group relative flex flex-col items-center gap-1.5 transition-all`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full border-4 transition-all ${
                        isSelected
                          ? 'border-gray-900 scale-110 shadow-lg'
                          : 'border-transparent hover:border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: palette.primary }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500 leading-tight text-center hidden sm:block">{palette.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected palette name + swatch strip */}
            {(() => {
              const selected = COLOR_PALETTES.find(
                (p) => p.primary.toLowerCase() === form.watch('primaryColor').toLowerCase()
              );
              return selected ? (
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: selected.primary }} />
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: selected.secondary }} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{selected.name}</span>
                  <span className="text-xs text-gray-400 font-mono">{selected.primary}</span>
                </div>
              ) : null;
            })()}

            {/* Live preview — smart contrast */}
            {(() => {
              const pc = form.watch('primaryColor');
              const { mainText, secondaryText, buttonBg, buttonText, isLight } = (() => {
                const clean = pc.replace('#', '');
                const r = parseInt(clean.slice(0, 2), 16);
                const g = parseInt(clean.slice(2, 4), 16);
                const b = parseInt(clean.slice(4, 6), 16);
                const light = (0.299 * r + 0.587 * g + 0.114 * b) > 153;
                return {
                  mainText: light ? '#1A1A1A' : '#FFFFFF',
                  secondaryText: light ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)',
                  buttonBg: light ? '#111111' : '#FFFFFF',
                  buttonText: light ? '#FFFFFF' : '#111111',
                  isLight: light,
                };
              })();
              return (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <div className="h-14 flex items-center justify-between px-5" style={{ backgroundColor: pc }}>
                    <span className="text-sm font-bold" style={{ color: mainText }}>Your Café Name</span>
                    <div className="flex gap-3">
                      {['Menu', 'About', 'Contact'].map(l => (
                        <span key={l} className="text-xs font-medium" style={{ color: secondaryText }}>{l}</span>
                      ))}
                    </div>
                  </div>
                  <div className="h-16 flex items-center gap-3 px-5 bg-white border-t border-gray-100">
                    <div className="px-4 py-1.5 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: buttonBg, color: buttonText }}>
                      {getBusinessPreset(tenant?.type)?.ctaLabel || 'Book Now'}
                    </div>
                    <div className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                      style={{ color: pc, borderColor: pc + '50' }}>
                      Learn More
                    </div>
                    <span className="ml-auto text-xs text-gray-400">
                      {isLight ? '🌤 Light → dark text' : '🌙 Dark → white text'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <button
            type="button"
            disabled={isSavingMedia}
            onClick={form.handleSubmit(handleSaveBrandingColors)}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingMedia && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Colour
          </button>
        </div>
      )}

      {/* ── STYLE TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'style' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-7">
            <div>
              <h2 className="font-semibold text-gray-900">Fine-tune the Look</h2>
              <p className="text-sm text-gray-500 mt-0.5">Applied on top of your template — changes take effect instantly on your site.</p>
            </div>

            {/* Typography Style */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Typography Style</label>
              <p className="text-xs text-gray-400 mb-3">Sets the heading font across your whole site. Each style is curated to match a type of venue.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TYPOGRAPHY_STYLES.map((typo) => (
                  <button
                    key={typo.id}
                    type="button"
                    onClick={() => setFontStyle(typo.id)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                      fontStyle === typo.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg leading-tight text-gray-800" style={typo.style}>{typo.preview}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{typo.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{typo.tagline}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radius */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Corner Radius</label>
              <div className="flex gap-2 flex-wrap">
                {RADIUS_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDesignTokens((t) => ({ ...t, radius: value }))}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      designTokens.radius === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-10 h-10 bg-gray-200"
                      style={{ borderRadius: value }}
                    />
                    {label}
                    <span className="text-xs text-gray-400 font-mono">{value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glass Effect */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Glass Cards</p>
                <p className="text-xs text-gray-400 mt-0.5">Frosted glass look on menu/service cards. Works best on dark or coloured backgrounds.</p>
              </div>
              <button
                type="button"
                onClick={() => setDesignTokens((t) => ({ ...t, glassEffect: !t.glassEffect }))}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                  designTokens.glassEffect ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  designTokens.glassEffect ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            {/* Glass preview */}
            {designTokens.glassEffect && (
              <div className="rounded-xl p-4 bg-gradient-to-br from-blue-600 to-purple-700">
                <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }}>
                  <div className="w-full h-24 rounded bg-white/10 mb-2" />
                  <div className="h-3 w-2/3 rounded bg-white/40 mb-1.5" />
                  <div className="h-3 w-1/3 rounded bg-white/25" />
                </div>
                <p className="text-white/60 text-xs mt-2 text-center">Glass card preview</p>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isSavingStyle}
            onClick={handleSaveStyle}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingStyle && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Style
          </button>
        </div>
      )}

    </div>
  );
}
