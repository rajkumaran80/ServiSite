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
import { getColorGroup, COLOR_GROUPS } from '../../../lib/theme';

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
  // Prestige & Clubroom
  { name: 'Deep Espresso',  primary: '#2D1E17', secondary: '#1A0F0A' },
  { name: 'Obsidian',       primary: '#1A1A1A', secondary: '#0A0A0A' },
  { name: 'Midnight Navy',  primary: '#0F172A', secondary: '#080F1C' },
  { name: 'Deep Cherry',    primary: '#480003', secondary: '#320002' },
  { name: 'Bottle Green',   primary: '#064E3B', secondary: '#043D2E' },
  { name: 'Antique Gold',   primary: '#A0843E', secondary: '#7A6430' },
  { name: 'Deep Burgundy',  primary: '#450A0A', secondary: '#2D0606' },
  // Artisan & Heritage
  { name: 'Oat Milk',       primary: '#F5F5DC', secondary: '#E8E8C8' },
  { name: 'Clay Brick',     primary: '#884C42', secondary: '#6B3A32' },
  { name: 'Dusky Plum',     primary: '#7A5C61', secondary: '#5E4549' },
  { name: 'Sage Leaf',      primary: '#B2AC88', secondary: '#928C6A' },
  { name: 'Warm Bronze',    primary: '#BE8A60', secondary: '#A0714A' },
  { name: 'Terracotta',     primary: '#EA580C', secondary: '#C2470A' },
  { name: 'Mushroom Taupe', primary: '#8D7B68', secondary: '#6E5F4F' },
  // Modern & Industrial
  { name: 'Slate Grey',     primary: '#475569', secondary: '#334155' },
  { name: 'Deep Teal',      primary: '#0D9488', secondary: '#0F766E' },
  { name: 'Midnight Blue',  primary: '#1E293B', secondary: '#0F172A' },
  { name: 'Graphite',       primary: '#1D1D1D', secondary: '#111111' },
  { name: 'Cool Silver',    primary: '#E2E8F0', secondary: '#CBD5E1' },
  { name: 'Ocean Blue',     primary: '#1D4ED8', secondary: '#1E40AF' },
  { name: 'Gunmetal Carbon',primary: '#262626', secondary: '#171717' },
  // Botanical & Fresh
  { name: 'Forest Green',   primary: '#14532D', secondary: '#0A3D1F' },
  { name: 'Wasabi',         primary: '#B7B53E', secondary: '#969430' },
  { name: 'Pale Sky',       primary: '#BAE6FD', secondary: '#93D4F8' },
  { name: 'Soft Mint',      primary: '#D1FAE5', secondary: '#A7F3D0' },
  { name: 'Sand',           primary: '#F3F4F6', secondary: '#E5E7EB' },
  { name: 'Pure White',     primary: '#FFFFFF', secondary: '#F9FAFB' },
  { name: 'Kelp Green',     primary: '#374131', secondary: '#252B21' },
  // Vibrant & Sweet
  { name: 'Banana Yellow',  primary: '#FEF08A', secondary: '#FDE047' },
  { name: 'Tangerine',      primary: '#F97316', secondary: '#EA580C' },
  { name: 'Bubblegum',      primary: '#EC4899', secondary: '#DB2777' },
  { name: 'Persimmon',      primary: '#E25822', secondary: '#C04518' },
  { name: 'Lavender',       primary: '#DDD6FE', secondary: '#C4B5FD' },
  { name: 'Coral Pink',     primary: '#F472B6', secondary: '#EC4899' },
  { name: 'Electric Violet',primary: '#7E22CE', secondary: '#6B21A8' },
];

type Tab = 'template' | 'banner' | 'logo' | 'colors' | 'style';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'template', label: 'Template',   icon: '🎨' },
  { id: 'banner',   label: 'Banner',     icon: '🖼️' },
  { id: 'logo',     label: 'Logo',        icon: '✏️' },
  { id: 'colors',   label: 'Colors',     icon: '🎭' },
  { id: 'style',    label: 'Menu Style', icon: '✦' },
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('grande');  // currently APPLIED
  const [pendingTemplate, setPendingTemplate] = useState<string>('grande');    // highlighted but not yet saved
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Design token state
  const [designTokens, setDesignTokens] = useState<DesignTokens>({ radius: '16px', glassEffect: false });
  const [fontStyle, setFontStyle] = useState<string>('modern');
  const [textColorOption, setTextColorOption] = useState<'signature' | 'offwhite'>('signature');
  const [footerAccent, setFooterAccent] = useState<'primary' | 'gold' | 'silver'>('primary');
  const [menuGroupStyle, setMenuGroupStyle] = useState<'pill' | 'rounded' | 'sharp'>('pill');
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  // Media state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDisplay, setLogoDisplay] = useState<'logo' | 'text' | 'both'>('logo');
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
      setPendingTemplate(ts.pageTemplate || 'grande');
      setDesignTokens(resolveDesignTokens(ts.pageTemplate, ts.designTokens));
      setFontStyle(ts.fontStyle || 'modern');
      setTextColorOption(ts.textColorOption || 'signature');
      setFooterAccent(ts.footerAccent || 'primary');
      setMenuGroupStyle(ts.menuGroupStyle || 'pill');
      setLogoUrl(t.logo || '');
      setLogoDisplay(ts.logoDisplay || 'logo');
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
      setPendingTemplate(templateId);
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
      const group = getColorGroup(data.primaryColor);
      const updated = await tenantService.update(tenant.id, {
        themeSettings: {
          ...ts,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily || group.headingFont,
          fontStyle,
          textColorOption,
          footerAccent,
          colorGroup: group.id,
          headingOnWhite: group.headingOnWhite,
          bodyOnWhite: group.bodyOnWhite,
          headingOnDark: group.headingOnDark,
          bodyOnDark: group.bodyOnDark,
          buttonRadius: group.buttonRadius,
        },
      });
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      toast.success(`${group.label} colour scheme saved`);
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
          menuGroupStyle,
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
          logoDisplay,
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
                      const isPending  = pendingTemplate === tmpl.id;
                      const isApplied  = selectedTemplate === tmpl.id;
                      const isRec = recommended.some((r) => r.id === tmpl.id);
                      return (
                        <div
                          key={tmpl.id}
                          className={`rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                            isPending
                              ? 'border-blue-500 shadow-lg scale-[1.01]'
                              : 'border-transparent hover:border-gray-200 hover:shadow-md'
                          } ${isSavingTemplate ? 'opacity-60 pointer-events-none' : ''}`}
                          onClick={() => setPendingTemplate(tmpl.id)}
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
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              {isApplied && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">Live</span>
                              )}
                              {isPending && !isApplied && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">Selected</span>
                              )}
                            </div>
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
          <button
            type="button"
            disabled={isSavingTemplate || pendingTemplate === selectedTemplate}
            onClick={() => handleSaveTemplate(pendingTemplate)}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingTemplate && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isSavingTemplate ? 'Applying…' : pendingTemplate === selectedTemplate ? 'Template Applied' : 'Apply Template'}
          </button>
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

      {/* ── LOGO TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-6">

            {/* Logo upload */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Logo Image</h3>
              <p className="text-sm text-gray-500 mb-3">Square images work best. Max 1 MB.</p>
              <div className="w-36">
                <ImageUpload
                  currentUrl={logoUrl}
                  mediaType="logo"
                  onUpload={(url) => setLogoUrl(url)}
                  aspectRatio="square"
                />
              </div>
            </div>

            {/* Navbar display mode */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Navbar Display</h3>
              <p className="text-sm text-gray-500 mb-3">What to show in the top navigation bar.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  {
                    id: 'logo' as const,
                    label: 'Logo Only',
                    description: 'Show your logo image — clean and visual.',
                    icon: '🖼️',
                    disabled: !logoUrl,
                    disabledHint: 'Upload a logo first',
                  },
                  {
                    id: 'text' as const,
                    label: 'Name Only',
                    description: 'Show your business name as styled text.',
                    icon: '✍️',
                    disabled: false,
                  },
                  {
                    id: 'both' as const,
                    label: 'Logo & Name',
                    description: 'Show both your logo and business name side by side.',
                    icon: '🔳',
                    disabled: !logoUrl,
                    disabledHint: 'Upload a logo first',
                  },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && setLogoDisplay(opt.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                        : logoDisplay === opt.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{opt.icon}</span>
                      {logoDisplay === opt.id && !opt.disabled && (
                        <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                      {opt.disabled && <span className="text-[9px] text-gray-400">{(opt as any).disabledHint}</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingMedia}
            onClick={handleSaveMedia}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingMedia && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Logo
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

            {/* Grouped palette swatches */}
            <div className="space-y-5">
              {COLOR_GROUPS.map((group) => {
                const groupPalettes = COLOR_PALETTES.filter(
                  (p) => getColorGroup(p.primary).id === group.id
                );
                return (
                  <div key={group.id}>
                    {/* Group header */}
                    <div className="mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-gray-800">{group.label}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-500">{group.headingFont} + {group.bodyFont}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{group.tagline}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5 italic">{group.decorationHint}</p>
                    </div>
                    {/* Swatches */}
                    <div className="flex gap-2 flex-wrap">
                      {groupPalettes.map((palette) => {
                        const isSelected = form.watch('primaryColor').toLowerCase() === palette.primary.toLowerCase();
                        return (
                          <button
                            key={palette.primary}
                            type="button"
                            title={palette.name}
                            onClick={() => {
                              form.setValue('primaryColor', palette.primary);
                              form.setValue('secondaryColor', palette.secondary);
                              form.setValue('fontFamily', group.headingFont);
                              setFontStyle(
                                group.id === 'prestige'  ? 'elegant'
                                : group.id === 'artisan'   ? 'elegant'
                                : group.id === 'botanical' ? 'elegant'
                                : group.id === 'vibrant'   ? 'cozy'
                                : 'modern'
                              );
                            }}
                            className="relative flex flex-col items-center gap-1 transition-all"
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
                                  <svg className="w-4 h-4 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-500 leading-tight text-center w-10 truncate">{palette.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected: group badge + font auto-applied notice */}
            {(() => {
              const selected = COLOR_PALETTES.find(
                (p) => p.primary.toLowerCase() === form.watch('primaryColor').toLowerCase()
              );
              if (!selected) return null;
              const group = getColorGroup(selected.primary);
              return (
                <div className="flex items-center gap-3 pt-1 bg-gray-50 rounded-lg px-4 py-3">
                  <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: selected.primary }} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{selected.name}
                      <span className="ml-2 text-xs font-normal text-gray-400 font-mono">{selected.primary}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-blue-600">{group.label}</span>
                      {' · '}Font auto-set to <span className="font-medium">{group.headingFont}</span>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Navigation bar text colour */}
            {(() => {
              const pc = form.watch('primaryColor');
              const grp = getColorGroup(pc);
              const clean = pc.replace('#', '');
              const r = parseInt(clean.slice(0, 2), 16) || 0;
              const g = parseInt(clean.slice(2, 4), 16) || 0;
              const b = parseInt(clean.slice(4, 6), 16) || 0;
              const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
              const isDarkEnoughForOffWhite = brightness < 160;

              const light = brightness > 153;
              const sigColour = light
                ? (grp.headingOnWhite === 'var(--primary-hex)' ? pc : grp.headingOnWhite)
                : grp.headingOnDark;
              // Off-White uses bodyOnDark (cream for Prestige, warm light for others)
              // — always distinct from the Signature gold/accent colour
              const offColour = grp.bodyOnDark;

              const options: { id: 'signature' | 'offwhite'; label: string; description: string; textSample: string; disabled?: boolean }[] = [
                {
                  id: 'signature',
                  label: 'Signature',
                  description: grp.id === 'prestige' ? 'Dark Gold — stands out on deep backgrounds' :
                    grp.id === 'artisan' ? 'Deep Cacao — rich warm contrast' :
                    grp.id === 'modern' ? 'Primary accent colour' :
                    grp.id === 'botanical' ? 'Moss Green — natural contrast' :
                    'Near Black — sharp and bold',
                  textSample: sigColour,
                },
                {
                  id: 'offwhite',
                  label: 'Off-White',
                  description: grp.id === 'prestige' ? 'Bone Cream — soft luxury on dark backgrounds' :
                    grp.id === 'artisan' ? 'Warm Light — gentle and readable' :
                    grp.id === 'modern' ? 'Light Grey — clean contrast' :
                    grp.id === 'botanical' ? 'Pale Sky — light and fresh' :
                    'Near White — bright and airy',
                  textSample: offColour,
                  disabled: !isDarkEnoughForOffWhite,
                },
              ];

              return (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Navigation Bar Text Colour</p>
                  <p className="text-xs text-gray-400 mb-3">Only affects the top navigation bar text. Page body colours are set automatically by the group.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => !opt.disabled && setTextColorOption(opt.id)}
                        title={opt.disabled ? 'Background too light for this option' : undefined}
                        className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                          opt.disabled
                            ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                            : textColorOption === opt.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-gray-800">{opt.label}</span>
                          {textColorOption === opt.id && !opt.disabled && (
                            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {opt.disabled && <span className="text-[9px] text-red-400 font-medium">Too light</span>}
                        </div>
                        {/* Mini navbar preview */}
                        <div className="w-full h-8 rounded-lg flex items-center justify-between px-3 mb-3" style={{ backgroundColor: pc }}>
                          <span className="text-xs font-bold" style={{ color: opt.textSample }}>Café Name</span>
                          <div className="flex gap-2">
                            {['Menu','About'].map(l => (
                              <span key={l} className="text-[10px]" style={{ color: opt.textSample, opacity: 0.75 }}>{l}</span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-snug">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Footer accent colour */}
            {(() => {
              const pc = form.watch('primaryColor');
              const clean = pc.replace('#', '');
              const r = parseInt(clean.slice(0, 2), 16) || 0;
              const g = parseInt(clean.slice(2, 4), 16) || 0;
              const b = parseInt(clean.slice(4, 6), 16) || 0;
              const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
              // Disable Primary if the brand colour is too dark to read on the dark footer bg
              const primaryTooDark = brightness < 70;
              const options = [
                {
                  id: 'primary' as const,
                  label: 'Primary',
                  colour: pc,
                  description: 'Uses your chosen brand colour',
                  disabled: primaryTooDark,
                  disabledHint: 'Too dark for footer',
                },
                {
                  id: 'gold' as const,
                  label: 'Gold',
                  colour: '#D4AF37',
                  description: 'Warm metallic — great for Prestige & Artisan',
                  disabled: false,
                },
                {
                  id: 'silver' as const,
                  label: 'Silver',
                  colour: '#CBD5E1',
                  description: 'Clean & minimal — great for Modern & Botanical',
                  disabled: false,
                },
              ];
              return (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Footer Accent Colour</p>
                  <p className="text-xs text-gray-400 mb-3">Colour used for section labels and links in the footer.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => !opt.disabled && setFooterAccent(opt.id)}
                        className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                          opt.disabled
                            ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                            : footerAccent === opt.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {/* Mini footer preview */}
                        <div className="w-full h-7 rounded-lg flex items-center justify-between px-2 mb-2" style={{ backgroundColor: '#111827' }}>
                          <span className="text-[9px] font-bold" style={{ color: opt.disabled ? '#6B7280' : opt.colour }}>Get In Touch</span>
                          <span className="text-[9px]" style={{ color: opt.disabled ? '#6B7280' : opt.colour, opacity: 0.8 }}>Hours</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">{opt.label}</span>
                          {footerAccent === opt.id && !opt.disabled && (
                            <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {opt.disabled && <span className="text-[9px] text-red-400">{(opt as any).disabledHint ?? 'Not suitable'}</span>}
                        </div>
                        <p className="text-[9px] text-gray-400 leading-snug mt-0.5">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Live preview — smart contrast */}
            {(() => {
              const pc = form.watch('primaryColor');
              const grp = getColorGroup(pc);
              const clean = pc.replace('#', '');
              const r = parseInt(clean.slice(0, 2), 16) || 0;
              const g = parseInt(clean.slice(2, 4), 16) || 0;
              const b = parseInt(clean.slice(4, 6), 16) || 0;
              const light = (0.299 * r + 0.587 * g + 0.114 * b) > 153;
              const sigColour = light
                ? (grp.headingOnWhite === 'var(--primary-hex)' ? pc : grp.headingOnWhite)
                : grp.headingOnDark;
              const navText = textColorOption === 'offwhite' ? grp.bodyOnDark : sigColour;
              const navMuted = navText === '#FFFFFF' || navText.startsWith('#F') || navText.startsWith('#D') || navText.startsWith('#C')
                ? 'rgba(255,255,255,0.65)'
                : 'rgba(0,0,0,0.58)';
              return (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {/* Navbar preview only */}
                  <div className="h-14 flex items-center justify-between px-5"
                    style={{ background: `${pc}e8`, backdropFilter: 'blur(12px)' }}>
                    <span className="text-sm font-black tracking-wide" style={{ color: navText, fontFamily: grp.headingFontStack }}>
                      {tenant?.name || 'Your Business'}
                    </span>
                    <div className="flex items-center gap-4">
                      {['Home', 'Menu', 'About', 'Contact'].map(l => (
                        <span key={l} className="text-xs font-semibold" style={{ color: navMuted }}>{l}</span>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Navigation bar preview</span>
                    <span className="text-[10px] font-mono text-gray-400">{navText}</span>
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

      {/* ── MENU STYLE TAB ────────────────────────────────────────────────── */}
      {activeTab === 'style' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-7">
            <div>
              <h2 className="font-semibold text-gray-900">Menu Style</h2>
              <p className="text-sm text-gray-500 mt-0.5">Controls how cards and buttons look on your menu and public pages.</p>
            </div>

            {/* Menu Group Button Style */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Menu Group Buttons</label>
              <p className="text-xs text-gray-400 mb-3">Style of the category tabs at the top of your menu page (e.g. Starters, Mains, Desserts).</p>
              <div className="flex gap-3 flex-wrap">
                {([
                  { id: 'pill',    label: 'Pill',    radius: '999px', preview: 'Starters' },
                  { id: 'rounded', label: 'Rounded', radius: '10px',  preview: 'Starters' },
                  { id: 'sharp',   label: 'Sharp',   radius: '0px',   preview: 'Starters' },
                ] as const).map((opt) => {
                  const pc = form.watch('primaryColor');
                  const isSelected = menuGroupStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMenuGroupStyle(opt.id)}
                      className={`flex flex-col items-center gap-2 px-5 py-3 border-2 transition-all ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ borderRadius: '12px' }}
                    >
                      <span
                        className="text-sm font-semibold text-white px-4 py-1.5"
                        style={{ backgroundColor: pc, borderRadius: opt.radius }}
                      >
                        {opt.preview}
                      </span>
                      <span className="text-xs font-medium text-gray-600">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item Card Corner Radius */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Item Card Corners</label>
              <p className="text-xs text-gray-400 mb-3">Applies to menu item cards in grid view and the Pick of the Day tiles on the home page.</p>
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
                    <div className="w-10 h-10 bg-gray-200" style={{ borderRadius: value }} />
                    {label}
                    <span className="text-xs text-gray-400 font-mono">{value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glass Effect toggle (no preview) */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">Glass Cards</p>
                <p className="text-xs text-gray-400 mt-0.5">Frosted glass look on menu cards. Works best on dark or coloured backgrounds.</p>
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
