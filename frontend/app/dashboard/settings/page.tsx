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
import type { Tenant, ContactInfo } from '../../../types/tenant.types';
import { getTemplatesForType, getPageTemplate } from '../../../config/page-templates';
import TemplatePreviewModal, { type TemplateColorScheme } from '../../../components/ui/TemplatePreviewModal';
import { revalidateTenantCache } from './actions';

const tenantSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  type: z.enum(['RESTAURANT', 'CAFE', 'BARBER_SHOP', 'SALON', 'GYM', 'REPAIR_SHOP', 'OTHER']),
  whatsappNumber: z.string().optional(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  locale: z.string().min(1),
  primaryColor: z.string().min(1),
  secondaryColor: z.string().min(1),
  fontFamily: z.string().min(1),
});
// Note: primaryColor/secondaryColor kept in schema so handleSaveTemplate can update them via setValue.

const contactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  mapUrl: z.string().optional(),
});

type TenantForm = z.infer<typeof tenantSchema>;
type ContactForm = z.infer<typeof contactSchema>;

const FONTS = ['Inter', 'Playfair Display', 'Roboto', 'Georgia', 'system-ui'];
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Tokyo',
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'CAD', 'AED', 'JPY'];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [promoImageUrl, setPromoImageUrl] = useState<string>('');
  const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', tiktok: '', twitter: '', youtube: '' });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalIndex, setTemplateModalIndex] = useState(0);
  const [storedTemplateColors, setStoredTemplateColors] = useState<TemplateColorScheme | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<'business' | 'branding' | 'domain'>('business');
  const [customDomain, setCustomDomain] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainStatus, setDomainStatus] = useState<string | null>(null);
  const [domainCname, setDomainCname] = useState<string>('');
  const [googlePlaceId, setGooglePlaceId] = useState<string>('');
  const [isLookingUpPlace, setIsLookingUpPlace] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);

  const tenantForm = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: user?.tenant?.name ?? '',
      type: 'RESTAURANT',
      currency: 'USD',
      timezone: 'UTC',
      locale: 'en',
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      fontFamily: 'Inter',
    },
  });

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    if (!user?.tenantId) return;

    const loadData = async () => {
      try {
        const [tenantRes, contactData] = await Promise.all([
          api.get<{ data: Tenant }>('/tenant/current'),
          tenantService.getContact(),
        ]);

        const currentTenant = tenantRes.data.data;
        if (currentTenant) {
          setTenant(currentTenant);
          setLogoUrl(currentTenant.logo || '');
          // Prefer bannerImages array, fall back to single banner field
          const storedBanners = (currentTenant.themeSettings as any)?.bannerImages;
          setBannerUrls(
            Array.isArray(storedBanners) && storedBanners.length > 0
              ? storedBanners
              : currentTenant.banner ? [currentTenant.banner] : []
          );
          setPromoImageUrl((currentTenant.themeSettings as any)?.promoImageUrl || '');
          const sl = (currentTenant.themeSettings as any)?.socialLinks || {};
          setSocialLinks({ instagram: sl.instagram || '', facebook: sl.facebook || '', tiktok: sl.tiktok || '', twitter: sl.twitter || '', youtube: sl.youtube || '' });
          setSelectedTemplate((currentTenant.themeSettings as any)?.pageTemplate || 'classic');
          const ts = currentTenant.themeSettings as any;
          if (ts?.primaryColor) {
            setStoredTemplateColors({
              primaryColor: ts.primaryColor,
              secondaryColor: ts.secondaryColor || ts.primaryColor,
              accentColor: ts.accentColor || ts.primaryColor,
              surfaceColor: ts.surfaceColor || '#f4f4f5',
            });
          }
          setGooglePlaceId((currentTenant.themeSettings as any)?.googlePlaceId || '');
          setCustomDomain(currentTenant.customDomain || '');
          setDomainInput(currentTenant.customDomain || '');
          setDomainStatus(currentTenant.customDomainStatus || null);
          setDomainCname(currentTenant.customDomainStatus !== 'active' ? 'origin.servisite.co.uk' : '');

          tenantForm.reset({
            name: currentTenant.name,
            type: currentTenant.type,
            whatsappNumber: currentTenant.whatsappNumber || '',
            currency: currentTenant.currency,
            timezone: currentTenant.timezone,
            locale: currentTenant.locale,
            primaryColor: currentTenant.themeSettings?.primaryColor || '#3B82F6',
            secondaryColor: currentTenant.themeSettings?.secondaryColor || '#1E40AF',
            fontFamily: currentTenant.themeSettings?.fontFamily || 'Inter',
          });
        }

        if (contactData) {
          setContact(contactData);
          contactForm.reset({
            phone: contactData.phone || '',
            email: contactData.email || '',
            address: contactData.address || '',
            city: contactData.city || '',
            state: contactData.state || '',
            country: contactData.country || '',
            zipCode: contactData.zipCode || '',
            mapUrl: contactData.mapUrl || '',
          });
        }
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  const handleSetCustomDomain = async () => {
    if (!tenant || !domainInput.trim()) return;
    setIsSavingDomain(true);
    try {
      const result = await tenantService.setCustomDomain(tenant.id, domainInput.trim());
      setCustomDomain(domainInput.trim().replace(/^www\./, ''));
      setDomainStatus('pending');
      setDomainCname(result.cname || 'origin.servisite.co.uk');
      toast.success('Domain saved — add the CNAME record then click Check Status');
    } catch {
      toast.error('Failed to save custom domain');
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!tenant) return;
    setIsVerifyingDomain(true);
    try {
      const result = await tenantService.verifyCustomDomain(tenant.id);
      if (result.status === 'active') {
        setDomainStatus('active');
        toast.success('Domain verified! Your custom domain is now active.');
      } else {
        toast.error(result.message || 'Not verified yet — check your nameservers and try again.');
      }
    } catch {
      toast.error('Verification failed');
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!tenant || !confirm('Remove the custom domain? This cannot be undone.')) return;
    try {
      await tenantService.removeCustomDomain(tenant.id);
      setCustomDomain('');
      setDomainInput('');
      setDomainStatus(null);
      setDomainCname('');
      toast.success('Custom domain removed');
    } catch {
      toast.error('Failed to remove custom domain');
    }
  };

  const handleSaveBusiness = async (data: TenantForm) => {
    if (!tenant) return;
    setIsSavingTenant(true);
    try {
      const contactData = contactForm.getValues();
      const cleanSocialLinks = Object.fromEntries(
        Object.entries(socialLinks).filter(([, v]) => v.trim())
      );
      const [updated] = await Promise.all([
        tenantService.update(tenant.id, {
          name: data.name,
          type: data.type,
          whatsappNumber: data.whatsappNumber,
          currency: data.currency,
          timezone: data.timezone,
          locale: data.locale,
          themeSettings: {
            googlePlaceId: googlePlaceId.trim() || undefined,
            socialLinks: Object.keys(cleanSocialLinks).length > 0 ? cleanSocialLinks : undefined,
          },
        }),
        tenantService.updateContact(contactData),
      ]);
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      // Auto-lookup Place ID if not already set
      if (!googlePlaceId && (contactData.address || contactData.city)) {
        await lookupPlaceId(data.name, contactData.address || '', contactData.city || '');
      }
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleSaveBranding = async (data: TenantForm) => {
    if (!tenant) return;
    setIsSavingTenant(true);
    try {
      const updated = await tenantService.update(tenant.id, {
        logo: logoUrl || undefined,
        themeSettings: {
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily,
          pageTemplate: selectedTemplate,
        },
      });
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      toast.success('Branding saved');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleSaveTemplate = async (templateId: string, customColors?: TemplateColorScheme) => {
    if (!tenant) return;
    setIsSavingTemplate(true);
    try {
      const tmpl = getPageTemplate(templateId);
      const updated = await tenantService.update(tenant.id, {
        themeSettings: {
          pageTemplate: templateId,
          primaryColor: customColors?.primaryColor ?? tmpl.primaryColor,
          secondaryColor: customColors?.secondaryColor ?? tmpl.secondaryColor,
          accentColor: customColors?.accentColor ?? tmpl.primaryColor,
          surfaceColor: customColors?.surfaceColor ?? (tmpl as any).surfaceColor ?? '#f4f4f5',
          fontFamily: tmpl.fontFamily,
        },
      });
      setTenant(updated);
      setSelectedTemplate(templateId);
      const appliedColors: TemplateColorScheme = {
        primaryColor: customColors?.primaryColor ?? tmpl.primaryColor,
        secondaryColor: customColors?.secondaryColor ?? tmpl.secondaryColor,
        accentColor: customColors?.accentColor ?? tmpl.primaryColor,
        surfaceColor: customColors?.surfaceColor ?? '#f4f4f5',
      };
      setStoredTemplateColors(appliedColors);
      tenantForm.setValue('primaryColor', appliedColors.primaryColor);
      tenantForm.setValue('secondaryColor', appliedColors.secondaryColor);
      tenantForm.setValue('fontFamily', tmpl.fontFamily);
      await revalidateTenantCache(tenant.slug);
      toast.success(`Template "${tmpl.name}" applied!`);
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const lookupPlaceId = async (businessName: string, address: string, city: string) => {
    const query = [businessName, address, city].filter(Boolean).join(' ');
    if (!query.trim()) return;
    setIsLookingUpPlace(true);
    try {
      const res = await api.get<{ data: { placeId: string; name: string; address: string } | null }>(
        `/google-reviews/find-place?q=${encodeURIComponent(query)}`
      );
      const result = res.data.data;
      if (result?.placeId) {
        setGooglePlaceId(result.placeId);
        toast.success(`Found: ${result.name} — Place ID set`);
      } else {
        toast.error('No matching place found — enter the Place ID manually');
      }
    } catch {
      // silently fail — user can enter manually
    } finally {
      setIsLookingUpPlace(false);
    }
  };

  const handleSaveContact = async (data: ContactForm) => {
    setIsSavingContact(true);
    try {
      const [updated] = await Promise.all([
        tenantService.updateContact(data),
        tenant
          ? tenantService.update(tenant.id, {
              themeSettings: { googlePlaceId: googlePlaceId.trim() || undefined },
            })
          : Promise.resolve(null),
      ]);
      setContact(updated);
      toast.success('Contact information saved');
      // Auto-lookup Place ID if not already set
      if (!googlePlaceId && (data.address || data.city)) {
        await lookupPlaceId(tenant?.name || '', data.address || '', data.city || '');
      }
    } catch {
      toast.error('Failed to save contact info');
    } finally {
      setIsSavingContact(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Customize your business page</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([
          { key: 'business', label: 'Business' },
          { key: 'branding', label: 'Branding' },
          { key: 'domain', label: 'Domain' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeSection === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Business Settings */}
      {activeSection === 'business' && (
        <form onSubmit={tenantForm.handleSubmit(handleSaveBusiness)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Business Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
              <input
                {...tenantForm.register('name')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {tenantForm.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{tenantForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Type</label>
              <select
                {...tenantForm.register('type')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="RESTAURANT">Restaurant</option>
                <option value="CAFE">Café</option>
                <option value="BARBER_SHOP">Barber Shop</option>
                <option value="SALON">Salon</option>
                <option value="GYM">Gym & Fitness</option>
                <option value="REPAIR_SHOP">Repair Shop</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                <select
                  {...tenantForm.register('currency')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                <select
                  {...tenantForm.register('timezone')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Language</label>
                <select
                  {...tenantForm.register('locale')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Contact Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Main Phone Number</label>
                <input
                  {...tenantForm.register('whatsappNumber')}
                  placeholder="+447911123456"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    tenantForm.setValue('whatsappNumber', e.target.value);
                    if (!contactForm.getValues('phone')) {
                      contactForm.setValue('phone', e.target.value);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
                <input
                  {...contactForm.register('phone')}
                  placeholder="+447911123456"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                {...contactForm.register('email')}
                placeholder="info@yourbusiness.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
              <input
                {...contactForm.register('address')}
                placeholder="123 Main Street"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  {...contactForm.register('city')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Postcode</label>
                <input
                  {...contactForm.register('zipCode')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input
                  {...contactForm.register('country')}
                  placeholder="United Kingdom"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Maps Embed URL</label>
              <input
                {...contactForm.register('mapUrl')}
                placeholder="https://maps.google.com/embed?..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Go to Google Maps → Share → Embed a map → copy the src URL</p>
            </div>

            {/* Google Place ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Place ID</label>
              <div className="flex gap-2">
                <input
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  placeholder="ChIJ..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => lookupPlaceId(tenantForm.getValues('name'), contactForm.getValues('address') || '', contactForm.getValues('city') || '')}
                  disabled={isLookingUpPlace}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  {isLookingUpPlace && <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />}
                  Auto-find
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Required to show Google Reviews on your site</p>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Social Media Links</h2>
              <p className="text-sm text-gray-500 mt-0.5">Shown on your home page and footer. Leave blank to hide.</p>
            </div>
            {([
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbusiness' },
              { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbusiness' },
              { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbusiness' },
              { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/yourbusiness' },
              { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourbusiness' },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <input
                  type="url"
                  value={socialLinks[key]}
                  onChange={(e) => setSocialLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSavingTenant}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingTenant && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save Settings
          </button>
        </form>
      )}

      {/* Branding */}
      {activeSection === 'branding' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Page Template</h2>
            <p className="text-sm text-gray-500 mb-6">Choose a visual style for your public website. This sets colours, fonts and layout.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {getTemplatesForType(tenant?.type).map((tmpl, idx) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    className={`rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                      isSelected ? 'border-blue-500 shadow-lg scale-[1.01]' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setTemplateModalIndex(idx);
                      setIsTemplateModalOpen(true);
                    }}
                  >
                    {/* Visual preview */}
                    <div className={`bg-gradient-to-br ${tmpl.previewGradient} p-5 h-32 flex flex-col justify-between relative overflow-hidden`}>
                      {/* Fake nav bar */}
                      <div className="flex items-center justify-between">
                        <div className={`w-16 h-2 rounded ${['typographic', 'vintage', 'luxe', 'cozy'].includes(tmpl.heroStyle) ? 'bg-gray-800/50' : 'bg-white/40'}`} />
                        <div className="flex gap-1.5">
                          {[1,2,3].map(i => <div key={i} className={`w-8 h-1.5 rounded ${['typographic', 'vintage', 'luxe', 'cozy'].includes(tmpl.heroStyle) ? 'bg-gray-500/40' : 'bg-white/30'}`} />)}
                        </div>
                      </div>
                      {/* Fake hero text */}
                      <div>
                        {tmpl.heroStyle === 'centered' ? (
                          <div className="text-center">
                            <div className="w-24 h-3 bg-white/70 rounded mx-auto mb-1.5" />
                            <div className="w-16 h-2 bg-white/40 rounded mx-auto" />
                          </div>
                        ) : tmpl.heroStyle === 'typographic' ? (
                          <div>
                            <div className="w-32 h-4 bg-gray-800/80 rounded mb-1" />
                            <div className="w-24 h-4 bg-gray-800/60 rounded mb-2" />
                            <div className="w-10 h-1 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'neon' ? (
                          <div>
                            <div className="w-28 h-3 bg-white/90 rounded mb-1.5" style={{ boxShadow: `0 0 6px ${tmpl.primaryColor}` }} />
                            <div className="w-16 h-1 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'sunset' ? (
                          <div className="text-center">
                            <div className="w-24 h-3 bg-white/90 rounded mx-auto mb-1.5 drop-shadow" />
                            <div className="w-16 h-2 bg-white/50 rounded mx-auto" />
                          </div>
                        ) : tmpl.heroStyle === 'vintage' ? (
                          <div>
                            <div className="w-24 h-1 mb-0.5 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                            <div className="w-28 h-3 bg-gray-900/80 rounded mt-1 mb-1.5" />
                            <div className="w-10 h-1.5 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'luxe' ? (
                          <div>
                            <div className="w-8 h-px mb-2" style={{ backgroundColor: tmpl.primaryColor }} />
                            <div className="w-28 h-3 bg-gray-700/70 rounded mb-1.5" />
                            <div className="w-10 h-px" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'power' ? (
                          <div>
                            <div className="w-6 h-1.5 mb-1.5 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                            <div className="w-28 h-4 bg-white/90 rounded mb-1.5" />
                            <div className="w-16 h-1 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'cozy' ? (
                          <div>
                            <div className="w-20 h-2 rounded-full mb-1.5" style={{ backgroundColor: `${tmpl.primaryColor}50` }} />
                            <div className="w-28 h-3 bg-amber-900/60 rounded mb-1.5" />
                            <div className="w-10 h-1 rounded-full" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'magazine' ? (
                          <div className="mt-auto pt-4">
                            <div className="w-8 h-0.5 mb-2" style={{ backgroundColor: tmpl.primaryColor }} />
                            <div className="w-32 h-4 bg-white/90 rounded mb-1" />
                            <div className="w-20 h-2.5 bg-white/50 rounded" />
                          </div>
                        ) : tmpl.heroStyle === 'split' ? (
                          <div className="flex h-full -m-5 mt-2">
                            <div className="flex-1 flex flex-col justify-center px-2 py-2" style={{ backgroundColor: tmpl.primaryColor }}>
                              <div className="w-16 h-2.5 bg-white/80 rounded mb-1" />
                              <div className="w-10 h-1.5 bg-white/50 rounded" />
                            </div>
                            <div className="w-1/3 bg-gray-400/40 rounded-r" />
                          </div>
                        ) : tmpl.heroStyle === 'cinematic' ? (
                          <div>
                            <div className="w-6 h-0.5 mb-2 flex gap-0.5">
                              {[...Array(4)].map((_, i) => <div key={i} className="flex-1 bg-white/40" />)}
                            </div>
                            <div className="w-28 h-3.5 bg-white/90 rounded mb-1" />
                            <div className="w-16 h-1 rounded" style={{ backgroundColor: tmpl.primaryColor }} />
                          </div>
                        ) : tmpl.heroStyle === 'geometric' ? (
                          <div>
                            <div className="w-32 h-4 rounded mb-1 border-2" style={{ borderColor: tmpl.primaryColor, backgroundColor: 'transparent' }} />
                            <div className="w-24 h-4 rounded border-2 ml-4" style={{ borderColor: `${tmpl.primaryColor}60`, backgroundColor: 'transparent' }} />
                          </div>
                        ) : tmpl.heroStyle === 'bold' ? (
                          <div className="flex gap-2 -m-5 mt-2 h-20 items-center">
                            <div className="flex-[3] h-full flex flex-col justify-center px-3" style={{ backgroundColor: tmpl.primaryColor }}>
                              <div className="w-16 h-2.5 bg-white/80 rounded mb-1" />
                              <div className="w-10 h-1.5 bg-white/50 rounded" />
                            </div>
                            <div className="flex-[2] h-full bg-gray-300/50 rounded-lg mx-1" />
                          </div>
                        ) : (
                          <div>
                            <div className="w-24 h-3 bg-white/80 rounded mb-1.5" />
                            <div className="w-16 h-2 bg-white/40 rounded" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-white p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{tmpl.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{tmpl.tagline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Colour dot */}
                        <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: tmpl.primaryColor }} />
                        {isSelected && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-gray-400">Click any template to preview and customise colours before applying.</p>

          {/* Images & Font */}
          <form onSubmit={tenantForm.handleSubmit(handleSaveBranding)} className="space-y-6 mt-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Images & Font</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Font Family</label>
                <select
                  {...tenantForm.register('fontFamily')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
                <ImageUpload
                  currentUrl={logoUrl}
                  mediaType="logo"
                  onUpload={(url) => setLogoUrl(url)}
                  aspectRatio="square"
                />
              </div>

            </div>

            <button
              type="submit"
              disabled={isSavingTenant}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {isSavingTenant && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Save Branding
            </button>
          </form>
        </div>
      )}

      {/* Custom Domain */}
      {activeSection === 'domain' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">Custom Domain</h2>
              <p className="text-sm text-gray-500 mt-1">
                Point your own domain (e.g. <span className="font-mono">pizzapalace.com</span>) to your ServiSite page instead of using the default subdomain.
              </p>
            </div>

            {/* Status badge */}
            {domainStatus && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                domainStatus === 'active' ? 'bg-green-100 text-green-700' :
                domainStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                domainStatus === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  domainStatus === 'active' ? 'bg-green-500' :
                  domainStatus === 'pending' ? 'bg-amber-500' :
                  domainStatus === 'failed' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                {domainStatus === 'active' ? 'Active' :
                 domainStatus === 'pending' ? 'Pending verification' :
                 domainStatus === 'failed' ? 'Verification failed' :
                 domainStatus}
                {customDomain && ` — ${customDomain}`}
              </div>
            )}

            {/* Domain input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Domain</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="pizzapalace.com"
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  disabled={domainStatus === 'active'}
                />
                {domainStatus !== 'active' && (
                  <button
                    type="button"
                    onClick={handleSetCustomDomain}
                    disabled={isSavingDomain || !domainInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isSavingDomain && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Save Domain
                  </button>
                )}
                {customDomain && (
                  <button
                    type="button"
                    onClick={handleRemoveDomain}
                    className="text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* DNS setup instructions */}
            {domainStatus === 'pending' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="font-semibold text-amber-900 text-sm">2 steps to connect your domain</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="text-amber-700 text-left border-b border-amber-200">
                          <th className="pr-4 pb-1.5 font-semibold">Type</th>
                          <th className="pr-4 pb-1.5 font-semibold">Host</th>
                          <th className="pb-1.5 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="text-amber-900">
                        <tr className="border-b border-amber-100">
                          <td className="pr-4 py-1.5 font-bold">CNAME</td>
                          <td className="pr-4 py-1.5">www</td>
                          <td className="py-1.5 break-all">{domainCname || 'origin.servisite.co.uk'}</td>
                        </tr>
                        <tr>
                          <td className="pr-4 py-1.5 font-bold">TXT</td>
                          <td className="pr-4 py-1.5">asuid.www</td>
                          <td className="py-1.5 break-all">921c9222c9c2a858b880fae91c6c5debf8263248bc34267e426f99771a6eab89</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-amber-200 pt-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-800">Also set up a domain forward (apex → www)</p>
                    <p className="text-xs text-amber-700">
                      In your registrar's <strong>Forwarding</strong> section, redirect <span className="font-mono">{customDomain}</span> → <span className="font-mono">https://www.{customDomain}</span> (HTTP redirect, 301). Leave "also set up for www" <strong>unchecked</strong>.
                    </p>
                  </div>

                  <p className="text-xs text-amber-700 border-t border-amber-200 pt-3">
                    SSL activates automatically. Changes usually propagate within minutes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyDomain}
                  disabled={isVerifyingDomain}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isVerifyingDomain && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Check Status
                </button>
              </div>
            )}

            {domainStatus === 'active' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Your custom domain <span className="font-mono font-bold">{customDomain}</span> is active.
                  Visitors can now reach your site at this domain.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template preview modal */}
      {isTemplateModalOpen && tenant && (
        <TemplatePreviewModal
          templates={getTemplatesForType(tenant.type)}
          initialIndex={templateModalIndex}
          currentTemplateId={selectedTemplate}
          storedColors={storedTemplateColors}
          isSaving={isSavingTemplate}
          onApply={async (templateId, colors) => {
            await handleSaveTemplate(templateId, colors);
            setIsTemplateModalOpen(false);
          }}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}
    </div>
  );
}
