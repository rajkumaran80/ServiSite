'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import tenantService from '../../../services/tenant.service';
import { api } from '../../../services/api';
import type { Tenant, ContactInfo } from '../../../types/tenant.types';
import { revalidateTenantCache } from './actions';
import facebookService, { FacebookConnection } from '../../../services/facebook.service';

const tenantSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  type: z.enum(['RESTAURANT', 'CAFE', 'BARBER_SHOP', 'SALON', 'GYM', 'REPAIR_SHOP', 'OTHER']),
  whatsappNumber: z.string().optional(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  locale: z.string().min(1),
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
  nearTo: z.string().optional(),
});

type TenantForm = z.infer<typeof tenantSchema>;
type ContactForm = z.infer<typeof contactSchema>;

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Tokyo',
];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'BRL', 'CAD', 'AED', 'JPY'];

function SettingsPageInner() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [activeSection, setActiveSection] = useState<'business' | 'contact' | 'hours' | 'domain' | 'social'>('business');
  const [socialLinks, setSocialLinks] = useState({ instagram: '', facebook: '', tiktok: '', twitter: '', youtube: '' });
  const [facebookHashtags, setFacebookHashtags] = useState('');
  const [isSavingSocial, setIsSavingSocial] = useState(false);
  // Facebook
  const [fbConnection, setFbConnection] = useState<FacebookConnection | null>(null);
  const [isConnectingFb, setIsConnectingFb] = useState(false);
  const [isDisconnectingFb, setIsDisconnectingFb] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domainStatus, setDomainStatus] = useState<string | null>(null);
  const [domainCname, setDomainCname] = useState<string>('');
  const [googlePlaceId, setGooglePlaceId] = useState<string>('');
  const [isLookingUpPlace, setIsLookingUpPlace] = useState(false);

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  type DayKey = typeof DAYS[number];
  type DayHours = { open: string; close: string; closed: boolean };
  const defaultHours = (): DayHours => ({ open: '09:00', close: '22:00', closed: false });
  const [openingHours, setOpeningHours] = useState<Record<DayKey, DayHours>>(() =>
    Object.fromEntries(DAYS.map((d) => [d, defaultHours()])) as Record<DayKey, DayHours>
  );
  const [isSavingHours, setIsSavingHours] = useState(false);
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
    },
  });

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  // Handle redirect back from Facebook OAuth
  useEffect(() => {
    const section = searchParams.get('section');
    const fb = searchParams.get('fb');
    if (section === 'social') setActiveSection('social');
    if (fb === 'connected') {
      toast.success('Facebook page connected!');
      facebookService.getConnection().then(setFbConnection).catch(() => {});
      // Remove query params without full reload
      router.replace('/dashboard/settings?section=social');
    }
  }, []);

  useEffect(() => {
    if (!user?.tenantId) return;

    const loadData = async () => {
      try {
        const [tenantRes, contactData, fbConn] = await Promise.all([
          api.get<{ data: Tenant }>('/tenant/current'),
          tenantService.getContact(),
          facebookService.getConnection().catch(() => null),
        ]);
        setFbConnection(fbConn);

        const currentTenant = tenantRes.data.data;
        if (currentTenant) {
          setTenant(currentTenant);
          setGooglePlaceId((currentTenant.themeSettings as any)?.googlePlaceId || '');
          const sl = (currentTenant.themeSettings as any)?.socialLinks || {};
          setSocialLinks({ instagram: sl.instagram || '', facebook: sl.facebook || '', tiktok: sl.tiktok || '', twitter: sl.twitter || '', youtube: sl.youtube || '' });
          setFacebookHashtags((currentTenant.themeSettings as any)?.facebookHashtags || '');
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
            nearTo: contactData.nearTo || '',
          });
          // Load opening hours — support both new {open,close,closed} and legacy string formats
          if (contactData.openingHours && typeof contactData.openingHours === 'object') {
            const loaded = Object.fromEntries(
              DAYS.map((d) => {
                const val = (contactData.openingHours as any)[d];
                if (!val) return [d, defaultHours()];
                if (typeof val === 'object' && 'open' in val) return [d, val];
                // Legacy string like "9:00 AM - 10:00 PM" or "Closed"
                if (typeof val === 'string') {
                  if (val.toLowerCase() === 'closed') return [d, { ...defaultHours(), closed: true }];
                  const match = val.match(/(\d+:\d+)\s*(AM|PM)?\s*[-–]\s*(\d+:\d+)\s*(AM|PM)?/i);
                  if (match) {
                    const toH24 = (t: string, ampm: string) => {
                      let [h, m] = t.split(':').map(Number);
                      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12;
                      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0;
                      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    };
                    return [d, { open: toH24(match[1], match[2]), close: toH24(match[3], match[4]), closed: false }];
                  }
                }
                return [d, defaultHours()];
              })
            ) as Record<DayKey, DayHours>;
            setOpeningHours(loaded);
          }
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

  const handleSaveHours = async () => {
    if (!tenant) return;
    setIsSavingHours(true);
    try {
      await tenantService.updateContact({ openingHours: openingHours as any });
      await revalidateTenantCache(tenant.slug);
      toast.success('Opening times saved');
    } catch {
      toast.error('Failed to save opening times');
    } finally {
      setIsSavingHours(false);
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

  const handleConnectFacebook = async () => {
    setIsConnectingFb(true);
    try {
      const url = await facebookService.getAuthUrl();
      window.location.href = url;
    } catch {
      toast.error('Failed to get Facebook authorisation URL');
      setIsConnectingFb(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if (!confirm('Disconnect your Facebook page?')) return;
    setIsDisconnectingFb(true);
    try {
      await facebookService.disconnect();
      setFbConnection(null);
      toast.success('Facebook disconnected');
    } catch {
      toast.error('Failed to disconnect Facebook');
    } finally {
      setIsDisconnectingFb(false);
    }
  };

  const handleSaveSocial = async () => {
    if (!tenant) return;
    setIsSavingSocial(true);
    try {
      const clean = Object.fromEntries(Object.entries(socialLinks).filter(([, v]) => v.trim()));
      const ts = tenant.themeSettings as any || {};
      const cleanHashtags = facebookHashtags.trim() || null;
      const updated = await tenantService.update(tenant.id, {
        themeSettings: { ...ts, socialLinks: Object.keys(clean).length > 0 ? clean : null, facebookHashtags: cleanHashtags },
      });
      setTenant(updated);
      await revalidateTenantCache(tenant.slug);
      toast.success('Social links saved');
    } catch {
      toast.error('Failed to save social links');
    } finally {
      setIsSavingSocial(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Site Info</h1>
        <p className="text-gray-500 text-sm mt-1">Your business details, contact info and opening hours</p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([
          { key: 'business', label: 'Business' },
          { key: 'contact', label: 'Contact' },
          { key: 'hours', label: 'Hours' },
          { key: 'domain', label: 'Domain' },
          { key: 'social', label: 'Social' },
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
        <>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp Number</label>
              <input
                {...tenantForm.register('whatsappNumber')}
                placeholder="+447911123456"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Used for the WhatsApp chat button on your site</p>
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
            Save Settings
          </button>
        </form>
        </>
      )}

      {/* Contact Details */}
      {activeSection === 'contact' && (
        <form onSubmit={contactForm.handleSubmit(handleSaveContact)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Contact Details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Main Phone / WhatsApp</label>
                <input
                  {...contactForm.register('phone')}
                  placeholder="+447911123456"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Location Hint
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <input
                {...contactForm.register('nearTo')}
                placeholder="e.g. Opposite the station, Next to Sainsbury's"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Shown below the address to help customers find you</p>
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
              <p className="text-xs text-gray-400 mt-1">Google Maps → Share → Embed a map → copy the src URL</p>
            </div>

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

          <button
            type="submit"
            disabled={isSavingContact}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingContact && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Contact
          </button>
        </form>
      )}

      {/* Opening Hours */}
      {activeSection === 'hours' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Opening Times</h2>
              <p className="text-sm text-gray-500 mt-0.5">Set your hours for each day. Shown in footer and contact page.</p>
            </div>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const h = openingHours[day];
                return (
                  <div key={day} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <span className="w-24 text-sm font-medium text-gray-700 capitalize flex-shrink-0">{day}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={h.closed}
                        onChange={(e) => setOpeningHours((prev) => ({ ...prev, [day]: { ...prev[day], closed: e.target.checked } }))}
                        className="accent-red-500"
                      />
                      <span className="text-xs text-gray-500">Closed</span>
                    </label>
                    {!h.closed && (
                      <>
                        <input
                          type="time"
                          value={h.open}
                          onChange={(e) => setOpeningHours((prev) => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-400 text-sm flex-shrink-0">to</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={(e) => setOpeningHours((prev) => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                          className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </>
                    )}
                    {h.closed && <span className="text-sm text-red-400 font-medium">Closed</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveHours}
            disabled={isSavingHours}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingHours && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Opening Times
          </button>
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
                          <td className="pr-4 py-1.5 font-bold">A</td>
                          <td className="pr-4 py-1.5">@</td>
                          <td className="py-1.5">104.21.5.20</td>
                        </tr>
                        <tr className="border-b border-amber-100">
                          <td className="pr-4 py-1.5 font-bold">A</td>
                          <td className="pr-4 py-1.5">@</td>
                          <td className="py-1.5">172.67.132.192</td>
                        </tr>
                        <tr className="border-b border-amber-100">
                          <td className="pr-4 py-1.5 font-bold">CNAME</td>
                          <td className="pr-4 py-1.5">www</td>
                          <td className="py-1.5 break-all">{domainCname || 'origin.servisite.co.uk'}</td>
                        </tr>
                        <tr className="border-b border-amber-100">
                          <td className="pr-4 py-1.5 font-bold">TXT</td>
                          <td className="pr-4 py-1.5">asuid</td>
                          <td className="py-1.5 break-all">921c9222c9c2a858b880fae91c6c5debf8263248bc34267e426f99771a6eab89</td>
                        </tr>
                        <tr>
                          <td className="pr-4 py-1.5 font-bold">TXT</td>
                          <td className="pr-4 py-1.5">asuid.www</td>
                          <td className="py-1.5 break-all">921c9222c9c2a858b880fae91c6c5debf8263248bc34267e426f99771a6eab89</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-amber-700 border-t border-amber-200 pt-3">
                    Add all 5 records above. SSL activates automatically once DNS propagates (usually 10–30 minutes).
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

      {/* Social Media Links */}
      {activeSection === 'social' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Social Media Links</h2>
              <p className="text-sm text-gray-500 mt-0.5">Shown in the footer and contact section. Leave blank to hide.</p>
            </div>

            {/* Facebook Page Connection */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1877F2' }}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Facebook Page Posting</p>
                  <p className="text-xs text-gray-500">
                    {fbConnection
                      ? `Connected to: ${fbConnection.pageName}`
                      : 'Authorise ServiSite to post menu items to your Facebook Page'}
                  </p>
                </div>
                {fbConnection ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Connected
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnectFacebook}
                      disabled={isDisconnectingFb}
                      className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 transition-colors"
                    >
                      {isDisconnectingFb ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectFacebook}
                    disabled={isConnectingFb}
                    className="flex-shrink-0 flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                    style={{ background: '#1877F2' }}
                  >
                    {isConnectingFb && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Connect
                  </button>
                )}
              </div>
              {!fbConnection && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5">
                  Once connected you can post any menu item directly to your Facebook Page from the Menu section, with AI-generated captions.
                </p>
              )}
            </div>

            {/* Facebook Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Facebook Post Hashtags <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={facebookHashtags}
                onChange={(e) => setFacebookHashtags(e.target.value)}
                placeholder="foodie, specialoffer, Manchester"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span>#</span> Enter hashtags separated by commas — they will be added automatically at the end of every AI-generated post
              </p>
            </div>

            {([
              { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbusiness' },
              { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/yourbusiness' },
              { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@yourbusiness' },
              { key: 'twitter',   label: 'X / Twitter', placeholder: 'https://x.com/yourbusiness' },
              { key: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@yourbusiness' },
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
            type="button"
            disabled={isSavingSocial}
            onClick={handleSaveSocial}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isSavingSocial && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Save Social Links
          </button>
        </div>
      )}

    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/4" /><div className="h-64 bg-gray-200 rounded-xl" /></div>}>
      <SettingsPageInner />
    </Suspense>
  );
}
