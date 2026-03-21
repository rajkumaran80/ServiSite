'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/auth.store';
import tenantService from '../../../services/tenant.service';
import ImageUpload from '../../../components/ui/ImageUpload';
import type { Tenant, ContactInfo } from '../../../types/tenant.types';
import { RESTAURANT_PAGE_TEMPLATES, getPageTemplate } from '../../../config/page-templates';

const tenantSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  type: z.enum(['RESTAURANT', 'SALON', 'REPAIR_SHOP', 'OTHER']),
  whatsappNumber: z.string().optional(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  locale: z.string().min(1),
  primaryColor: z.string().min(1),
  secondaryColor: z.string().min(1),
  fontFamily: z.string().min(1),
});

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
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [promoImageUrl, setPromoImageUrl] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('classic');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'appearance' | 'design' | 'contact'>('general');

  const tenantForm = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
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
        const [allTenants, contactData] = await Promise.all([
          tenantService.getAll(),
          tenantService.getContact(),
        ]);

        const currentTenant = allTenants.find((t) => t.id === user.tenantId);
        if (currentTenant) {
          setTenant(currentTenant);
          setLogoUrl(currentTenant.logo || '');
          setBannerUrl(currentTenant.banner || '');
          setPromoImageUrl((currentTenant.themeSettings as any)?.promoImageUrl || '');
          setSelectedTemplate((currentTenant.themeSettings as any)?.pageTemplate || 'classic');

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

  const handleSaveTenant = async (data: TenantForm) => {
    if (!tenant) return;
    setIsSavingTenant(true);
    try {
      const updated = await tenantService.update(tenant.id, {
        name: data.name,
        type: data.type,
        whatsappNumber: data.whatsappNumber,
        currency: data.currency,
        timezone: data.timezone,
        locale: data.locale,
        logo: logoUrl || undefined,
        banner: bannerUrl || undefined,
        themeSettings: {
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          fontFamily: data.fontFamily,
          promoImageUrl: promoImageUrl || undefined,
          pageTemplate: selectedTemplate,
        },
      });
      setTenant(updated);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleSaveTemplate = async (templateId: string) => {
    if (!tenant) return;
    setIsSavingTemplate(true);
    try {
      const tmpl = getPageTemplate(templateId);
      const updated = await tenantService.update(tenant.id, {
        themeSettings: {
          ...(tenant.themeSettings as any || {}),
          pageTemplate: templateId,
          primaryColor: tmpl.primaryColor,
          secondaryColor: tmpl.secondaryColor,
          fontFamily: tmpl.fontFamily,
          promoImageUrl: promoImageUrl || undefined,
        },
      });
      setTenant(updated);
      setSelectedTemplate(templateId);
      toast.success(`Template "${tmpl.name}" applied!`);
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveContact = async (data: ContactForm) => {
    setIsSavingContact(true);
    try {
      const updated = await tenantService.updateContact(data);
      setContact(updated);
      toast.success('Contact information saved');
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Customize your business page</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['general', 'design', 'appearance', 'contact'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeSection === section
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeSection === 'general' && (
        <form onSubmit={tenantForm.handleSubmit(handleSaveTenant)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">General Information</h2>

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

            <div className="grid sm:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
                <input
                  {...tenantForm.register('whatsappNumber')}
                  placeholder="+1234567890"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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

          <button
            type="submit"
            disabled={isSavingTenant}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingTenant && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save General Settings
          </button>
        </form>
      )}

      {/* Design / Template Picker */}
      {activeSection === 'design' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Page Template</h2>
            <p className="text-sm text-gray-500 mb-6">Choose a visual style for your public website. This sets colours, fonts and layout.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {RESTAURANT_PAGE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    className={`rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                      isSelected ? 'border-blue-500 shadow-lg scale-[1.01]' : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                  >
                    {/* Visual preview */}
                    <div className={`bg-gradient-to-br ${tmpl.previewGradient} p-5 h-32 flex flex-col justify-between relative overflow-hidden`}>
                      {/* Fake nav bar */}
                      <div className="flex items-center justify-between">
                        <div className="w-16 h-2 bg-white/40 rounded" />
                        <div className="flex gap-1.5">
                          {[1,2,3].map(i => <div key={i} className="w-8 h-1.5 bg-white/30 rounded" />)}
                        </div>
                      </div>
                      {/* Fake hero text */}
                      <div>
                        {tmpl.heroStyle === 'centered' ? (
                          <div className="text-center">
                            <div className="w-24 h-3 bg-white/70 rounded mx-auto mb-1.5" />
                            <div className="w-16 h-2 bg-white/40 rounded mx-auto" />
                          </div>
                        ) : tmpl.heroStyle === 'minimal' ? (
                          <div>
                            <div className="w-28 h-3 bg-white/80 rounded mb-1.5" />
                            <div className="w-20 h-2 bg-white/40 rounded" />
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

          <button
            onClick={() => handleSaveTemplate(selectedTemplate)}
            disabled={isSavingTemplate}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingTemplate && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Apply Template
          </button>
        </div>
      )}

      {/* Appearance Settings */}
      {activeSection === 'appearance' && (
        <form onSubmit={tenantForm.handleSubmit(handleSaveTenant)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Branding & Theme</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    {...tenantForm.register('primaryColor')}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    {...tenantForm.register('primaryColor')}
                    placeholder="#3B82F6"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Secondary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    {...tenantForm.register('secondaryColor')}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    {...tenantForm.register('secondaryColor')}
                    placeholder="#1E40AF"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Banner Image</label>
              <p className="text-xs text-gray-400 mb-2">Full-width hero image shown at the top of your page</p>
              <ImageUpload
                currentUrl={bannerUrl}
                mediaType="banner"
                onUpload={(url) => setBannerUrl(url)}
                aspectRatio="banner"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">About / Promo Section Image</label>
              <p className="text-xs text-gray-400 mb-2">Shown in the mid-page section — great for a restaurant interior, team photo, or product shot</p>
              <ImageUpload
                currentUrl={promoImageUrl}
                mediaType="banner"
                onUpload={(url) => setPromoImageUrl(url)}
                aspectRatio="banner"
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
            Save Appearance
          </button>
        </form>
      )}

      {/* Contact Settings */}
      {activeSection === 'contact' && (
        <form onSubmit={contactForm.handleSubmit(handleSaveContact)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Contact Information</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  {...contactForm.register('phone')}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                <input
                  {...contactForm.register('state')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Zip Code</label>
                <input
                  {...contactForm.register('zipCode')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
              <input
                {...contactForm.register('country')}
                placeholder="United States"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Google Maps Embed URL
              </label>
              <input
                {...contactForm.register('mapUrl')}
                placeholder="https://maps.google.com/embed?..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Go to Google Maps → Share → Embed a map → copy the src URL
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingContact}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingContact && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Save Contact Information
          </button>
        </form>
      )}
    </div>
  );
}
