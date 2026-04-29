'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import superAdminService, { TenantSummary, CreateTenantPayload } from '../../services/superadmin.service';
import { BUSINESS_TEMPLATES, BusinessTemplate } from '../../config/templates';

// Safe auth store hook that prevents SSR access
function useSafeAuthStore() {
  const [isMounted, setIsMounted] = useState(false);
  const authStore = useAuthStore();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return {
      user: null,
      isAuthenticated: false,
      logout: authStore.logout,
    };
  }
  
  return authStore;
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white';

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Step 1: Template Picker ──────────────────────────────────────────────────

function TemplatePicker({ onSelect }: { onSelect: (t: BusinessTemplate) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Choose a Business Template</h2>
          <p className="text-sm text-gray-500 mt-1">Pre-filled with sample menu items. You can customise everything after.</p>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BUSINESS_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.type}
              onClick={() => onSelect(tmpl)}
              className="group relative overflow-hidden rounded-2xl border-2 border-transparent hover:border-purple-400 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl text-left"
            >
              {/* Gradient card */}
              <div className={`bg-gradient-to-br ${tmpl.gradient} p-5 aspect-[4/3] flex flex-col justify-between`}>
                <span className="text-4xl">{tmpl.icon}</span>
                <div>
                  <p className="text-white font-bold text-base leading-tight">{tmpl.label}</p>
                  <p className="text-white/70 text-xs mt-0.5 line-clamp-2 leading-snug">{tmpl.description}</p>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors rounded-2xl flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                  Select →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Details form ────────────────────────────────────────────────────

function AddTenantModal({
  template,
  onBack,
  onClose,
  onSave,
}: {
  template: BusinessTemplate;
  onBack: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<CreateTenantPayload>({
    name: '',
    slug: '',
    type: template.type,
    currency: template.defaultCurrency,
    adminEmail: '',
    adminPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugManual, setSlugManual] = useState(false);

  const set = (key: keyof CreateTenantPayload, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !slugManual) next.slug = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.adminEmail || !form.adminPassword) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      await superAdminService.createTenant(form);
      toast.success(`${template.label} created with sample content!`);
      onSave();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header with template preview */}
        <div className={`bg-gradient-to-r ${template.gradient} px-6 py-5 rounded-t-2xl`}>
          <button onClick={onBack} className="text-white/70 hover:text-white text-xs mb-3 flex items-center gap-1 transition-colors">
            ← Back to templates
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon}</span>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{template.label}</p>
              <p className="text-white/70 text-xs">{template.description}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={`e.g. The Golden ${template.label}`}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug * <span className="text-gray-400 font-normal">(used in URL)</span>
            </label>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => { setSlugManual(true); set('slug', slugify(e.target.value)); }}
              placeholder="my-business-name"
            />
            <p className="text-xs text-gray-400 mt-1">
              localhost:3000/<span className="font-medium text-gray-600">{form.slug || '...'}</span>/menu
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
            <select className={inputClass} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
              <option value="GBP">GBP £</option>
              <option value="USD">USD $</option>
              <option value="EUR">EUR €</option>
              <option value="INR">INR ₹</option>
              <option value="AUD">AUD $</option>
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Admin Account</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  className={inputClass}
                  value={form.adminEmail}
                  onChange={(e) => set('adminEmail', e.target.value)}
                  placeholder="admin@business.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className={inputClass}
                    value={form.adminPassword}
                    onChange={(e) => set('adminPassword', e.target.value)}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sample content note */}
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700">
            <span className="font-semibold">✨ Template included:</span> Sample menu groups, categories & items will be created automatically.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
              style={{ backgroundColor: template.primaryColor }}
            >
              {saving ? 'Creating...' : `Create ${template.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Change Email Modal ───────────────────────────────────────────────────────

function ChangeEmailModal({
  tenant,
  onConfirm,
  onCancel,
}: {
  tenant: TenantSummary;
  onConfirm: (newEmail: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState(tenant.users[0]?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) { toast.error('Enter a valid email'); return; }
    setSaving(true);
    try {
      await onConfirm(email.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Change Admin Email</h2>
          <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New email address</label>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="new@email.com"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Update Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Change Plan Modal ────────────────────────────────────────────────────────

function ChangePlanModal({
  tenant,
  onConfirm,
  onCancel,
}: {
  tenant: TenantSummary;
  onConfirm: (plan: 'BASIC' | 'ORDERING') => Promise<void>;
  onCancel: () => void;
}) {
  const [plan, setPlan] = useState<'BASIC' | 'ORDERING'>((tenant.plan as 'BASIC' | 'ORDERING') || 'BASIC');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(plan);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Change Subscription Plan</h2>
          <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-3">
            {[
              { value: 'BASIC', label: 'Basic', desc: 'Website with menu, gallery & contact', price: '£49/month' },
              { value: 'ORDERING', label: 'Ordering', desc: 'Basic + full online ordering system', price: '£99/month' },
            ].map((opt) => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-colors ${plan === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="plan" value={opt.value} checked={plan === opt.value}
                  onChange={() => setPlan(opt.value as 'BASIC' | 'ORDERING')} className="mt-0.5 accent-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{opt.label} — <span className="text-blue-600">{opt.price}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteTenantModal({
  tenant,
  onConfirm,
  onCancel,
  deleting,
}: {
  tenant: TenantSummary;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed === tenant.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="bg-red-50 border-b border-red-100 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl">⚠️</div>
            <div>
              <h2 className="text-lg font-bold text-red-900">Delete Tenant</h2>
              <p className="text-sm text-red-600">This action is permanent and cannot be undone.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5 text-gray-700">
            <p><span className="font-medium">Business:</span> {tenant.name}</p>
            <p><span className="font-medium">Slug:</span> {tenant.slug}</p>
            <p><span className="font-medium">Admin:</span> {tenant.users[0]?.email || '—'}</p>
          </div>

          <p className="text-sm text-gray-600">
            This will permanently delete the business, all users, menu items, orders, gallery images, and billing records.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Type <span className="font-bold text-red-700">{tenant.name}</span> to confirm:
            </label>
            <input
              autoFocus
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={tenant.name}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {typed.length > 0 && !matches && (
              <p className="text-xs text-red-500 mt-1">Name does not match</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!matches || deleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cloudflare Card ──────────────────────────────────────────────────────────

function CloudflareCard() {
  const [applying, setApplying] = useState(false);
  const [rules, setRules] = useState<any[] | null>(null);
  const [loadingRules, setLoadingRules] = useState(false);

  const handleApply = async () => {
    if (!confirm('Apply rate limiting rules to Cloudflare? This will replace any existing rules in the http_ratelimit phase.')) return;
    setApplying(true);
    try {
      const result = await superAdminService.setupRateLimiting();
      toast.success(`${result.rulesApplied} rate limiting rules applied to Cloudflare`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to apply rules');
    } finally {
      setApplying(false);
    }
  };

  const handleCheck = async () => {
    setLoadingRules(true);
    try {
      const r = await superAdminService.getRateLimitingRules();
      setRules(r);
    } catch {
      toast.error('Failed to fetch rules');
    } finally {
      setLoadingRules(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cloudflare Rate Limiting</h2>
          <p className="text-xs text-gray-500 mt-0.5">Auth: 10 req/min · Registration: 5 req/min · API: 300 req/min — all per IP</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCheck} disabled={loadingRules}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {loadingRules ? 'Loading...' : 'Check Rules'}
          </button>
          <button onClick={handleApply} disabled={applying}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
            {applying ? 'Applying...' : 'Apply Rules'}
          </button>
        </div>
      </div>
      {rules !== null && (
        <div className="mt-2 bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-48 overflow-y-auto">
          {rules.length === 0
            ? <span className="text-gray-400">No rate limiting rules configured</span>
            : rules.map((r, i) => (
                <div key={i} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                  <span className="font-semibold text-gray-900">{r.description || `Rule ${i + 1}`}</span>
                  <div className="text-gray-500 mt-0.5">{r.expression}</div>
                  <div className="text-green-700 mt-0.5">
                    {r.ratelimit?.requests_per_period} req/{r.ratelimit?.period}s → block {r.ratelimit?.mitigation_timeout}s
                  </div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Pricing Config Card ──────────────────────────────────────────────────────

function PricingCard() {
  const [pricing, setPricing] = useState({ registrationFee: 299, basicMonthly: 49, orderingMonthly: 99 });
  const [form, setForm] = useState({ registrationFee: '299', basicMonthly: '49', orderingMonthly: '99' });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    superAdminService.getPricing().then((p) => {
      setPricing(p);
      setForm({ registrationFee: String(p.registrationFee), basicMonthly: String(p.basicMonthly), orderingMonthly: String(p.orderingMonthly) });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const reg = parseFloat(form.registrationFee);
    const basic = parseFloat(form.basicMonthly);
    const ordering = parseFloat(form.orderingMonthly);
    if (isNaN(reg) || isNaN(basic) || isNaN(ordering)) { toast.error('Enter valid numbers'); return; }
    setSaving(true);
    try {
      await superAdminService.setPricing({ registrationFee: reg, basicMonthly: basic, orderingMonthly: ordering });
      setPricing({ registrationFee: reg, basicMonthly: basic, orderingMonthly: ordering });
      toast.success('Global pricing updated');
    } catch { toast.error('Failed to save pricing'); }
    finally { setSaving(false); }
  };

  if (!loaded) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Global Default Pricing (£)</h2>
      <form onSubmit={handleSave} className="flex flex-wrap gap-4 items-end">
        {[
          { key: 'registrationFee', label: 'Registration Fee (one-time)' },
          { key: 'basicMonthly', label: 'Basic Plan (monthly)' },
          { key: 'orderingMonthly', label: 'Ordering Plan (monthly)' },
        ].map(({ key, label }) => (
          <div key={key} className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        ))}
        <button type="submit" disabled={saving}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
          {saving ? 'Saving...' : 'Save Pricing'}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-3">These are display defaults. Stripe prices are not automatically updated — update Stripe separately if needed.</p>
    </div>
  );
}

// ─── Per-Tenant Pricing Override Modal ───────────────────────────────────────

function TenantPricingModal({
  tenant,
  onClose,
}: {
  tenant: TenantSummary;
  onClose: () => void;
}) {
  const [override, setOverride] = useState<{ registrationFee: string; basicMonthly: string; orderingMonthly: string } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    superAdminService.getTenantPricing(tenant.id).then((p) => {
      if (p) {
        setEnabled(true);
        setOverride({
          registrationFee: String(p.registrationFee ?? ''),
          basicMonthly: String(p.basicMonthly ?? ''),
          orderingMonthly: String(p.orderingMonthly ?? ''),
        });
      } else {
        setOverride({ registrationFee: '', basicMonthly: '', orderingMonthly: '' });
      }
      setLoaded(true);
    }).catch(() => {
      setOverride({ registrationFee: '', basicMonthly: '', orderingMonthly: '' });
      setLoaded(true);
    });
  }, [tenant.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!enabled) {
        await superAdminService.setTenantPricing(tenant.id, null);
        toast.success('Pricing override removed — using global defaults');
      } else {
        const payload: Record<string, number> = {};
        if (override?.registrationFee) payload.registrationFee = parseFloat(override.registrationFee);
        if (override?.basicMonthly) payload.basicMonthly = parseFloat(override.basicMonthly);
        if (override?.orderingMonthly) payload.orderingMonthly = parseFloat(override.orderingMonthly);
        await superAdminService.setTenantPricing(tenant.id, payload);
        toast.success('Tenant pricing override saved');
      }
      onClose();
    } catch { toast.error('Failed to save pricing override'); }
    finally { setSaving(false); }
  };

  if (!loaded) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Pricing Override</h2>
          <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-purple-600" />
            <span className="text-sm font-medium text-gray-700">Override global pricing for this tenant</span>
          </label>
          {enabled && override && (
            <div className="space-y-3">
              {[
                { key: 'registrationFee', label: 'Registration Fee (£)' },
                { key: 'basicMonthly', label: 'Basic Monthly (£)' },
                { key: 'orderingMonthly', label: 'Ordering Monthly (£)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="Leave blank to use global default"
                    value={override[key as keyof typeof override]}
                    onChange={(e) => setOverride((o) => o ? { ...o, [key]: e.target.value } : o)}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Extend Grace Period Modal ────────────────────────────────────────────────

function ExtendGraceModal({
  tenant,
  onConfirm,
  onCancel,
}: {
  tenant: TenantSummary;
  onConfirm: (days: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [days, setDays] = useState('7');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(days, 10);
    if (!n || n < 1 || n > 365) { toast.error('Enter between 1 and 365 days'); return; }
    setSaving(true);
    try { await onConfirm(n); } finally { setSaving(false); }
  };

  const currentEnd = tenant.gracePeriodEndsAt
    ? new Date(tenant.gracePeriodEndsAt).toLocaleDateString()
    : 'not set';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Extend Grace Period</h2>
          <p className="text-sm text-gray-500 mt-1">{tenant.name}</p>
          <p className="text-xs text-gray-400 mt-1">Current grace end: {currentEnd}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Extend by (days)</label>
            <input
              autoFocus
              type="number"
              min="1"
              max="365"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={inputClass}
              placeholder="7"
            />
            <p className="text-xs text-gray-400 mt-1">
              Added from today or current grace end (whichever is later).
              {tenant.status === 'SUSPENDED' && ' Tenant will be moved back to GRACE status.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Extend Grace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tenant actions dropdown ──────────────────────────────────────────────────

function TenantActionsMenu({
  tenant,
  onResetPassword,
  onChangeEmail,
  onChangePlan,
  onToggleStatus,
  onPricing,
  onSeedMenu,
  onExtendGrace,
  onRepairDomain,
  onPurgeDomainCache,
  onDelete,
  seedingId,
  resettingId,
  togglingId,
  changingCategoryId,
  onChangeCategory,
}: {
  tenant: TenantSummary;
  onResetPassword: () => void;
  onChangeEmail: () => void;
  onChangePlan: () => void;
  onToggleStatus: () => void;
  onPricing: () => void;
  onSeedMenu: () => void;
  onExtendGrace: () => void;
  onRepairDomain: () => void;
  onPurgeDomainCache: () => void;
  onDelete: () => void;
  seedingId: string | null;
  resettingId: string | null;
  togglingId: string | null;
  changingCategoryId: string | null;
  onChangeCategory: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const item = (label: string, onClick: () => void, className = 'text-gray-700 hover:bg-gray-50') => (
    <button
      type="button"
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="More actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {item('Reset Password', onResetPassword)}
          {item('Change Email', onChangeEmail)}
          {item('Change Plan', onChangePlan)}
          {item(
            tenant.serviceProfile === 'FOOD_SERVICE' ? 'Switch to General' : 'Switch to Food',
            onChangeCategory,
          )}
          <div className="border-t border-gray-100" />
          {item('Pricing Override', onPricing)}
          {item('Extend Grace Period', onExtendGrace, 'text-amber-700 hover:bg-amber-50')}
          {item(
            tenant.status === 'SUSPENDED' ? 'Re-enable' : 'Disable',
            onToggleStatus,
            tenant.status === 'SUSPENDED' ? 'text-green-700 hover:bg-green-50' : 'text-amber-700 hover:bg-amber-50',
          )}
          <div className="border-t border-gray-100" />
          {item('Seed Menu', onSeedMenu, 'text-purple-700 hover:bg-purple-50')}
          {tenant.customDomain && item('Fix Domain DNS', onRepairDomain, 'text-teal-700 hover:bg-teal-50')}
          {tenant.customDomain && item('Purge Domain Cache', onPurgeDomainCache, 'text-teal-700 hover:bg-teal-50')}
          <div className="border-t border-gray-100" />
          {item('Delete', onDelete, 'text-red-600 hover:bg-red-50')}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useSafeAuthStore();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [stats, setStats] = useState({ tenantCount: 0, userCount: 0, itemCount: 0 });
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'closed' | 'pick' | 'details'>('closed');
  const [selectedTemplate, setSelectedTemplate] = useState<BusinessTemplate | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantSummary | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [changeEmailTarget, setChangeEmailTarget] = useState<TenantSummary | null>(null);
  const [changePlanTarget, setChangePlanTarget] = useState<TenantSummary | null>(null);
  const [tenantPricingTarget, setTenantPricingTarget] = useState<TenantSummary | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [seedingId, setSeedingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [changingCategoryId, setChangingCategoryId] = useState<string | null>(null);
  const [extendGraceTarget, setExtendGraceTarget] = useState<TenantSummary | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    if (!isAuthenticated) { router.replace('/superadmin/login'); return; }
    if (user?.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
    loadData();
  }, [isAuthenticated, user, isClient]);

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">S</div>
          <h1 className="text-2xl font-bold text-gray-900">ServiSite Admin</h1>
          <div className="mt-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  const loadData = async () => {
    try {
      const [s, t] = await Promise.all([superAdminService.getStats(), superAdminService.listTenants()]);
      setStats(s);
      setTenants(t);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await superAdminService.deleteTenant(deleteTarget.id);
      setTenants((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setStats((prev) => ({ ...prev, tenantCount: prev.tenantCount - 1 }));
      toast.success('Tenant deleted');
      setDeleteTarget(null);
    } catch { toast.error('Failed to delete tenant'); }
    finally { setDeletingId(null); }
  };

  const buildTenantUrl = (slug: string, path: string) => {
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost';
    const isLocalhost = appDomain === 'localhost' || appDomain.startsWith('localhost:');
    if (isLocalhost) {
      const port = window.location.port || '3000';
      return `http://${slug}.localhost:${port}${path}`;
    }
    return `https://${slug}.${appDomain}${path}`;
  };

  const handleImpersonate = async (t: TenantSummary) => {
    setImpersonatingId(t.id);
    try {
      const { accessToken, refreshToken, user, tenantSlug } = await superAdminService.impersonate(t.id);
      const userParam = encodeURIComponent(JSON.stringify(user));
      const url = buildTenantUrl(tenantSlug, `/auth/impersonate?accessToken=${accessToken}&refreshToken=${refreshToken}&user=${userParam}`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to open dashboard');
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleApplyTemplate = async (t: TenantSummary) => {
    const haItems = t._count.menuItems > 0;
    const msg = haItems
      ? `"${t.name}" already has ${t._count.menuItems} items. Overwrite with the default template? This will delete all existing menu data.`
      : `Seed "${t.name}" with the default ${t.type} template?`;
    if (!confirm(msg)) return;
    setSeedingId(t.id);
    try {
      await superAdminService.applyTemplate(t.id, haItems);
      toast.success('Template applied — menu seeded');
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x } : x));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to apply template');
    } finally {
      setSeedingId(null);
    }
  };

  const handleToggleStatus = async (t: TenantSummary) => {
    const isSuspended = t.status === 'SUSPENDED';
    const action = isSuspended ? 'enable' : 'disable';
    if (!confirm(`${action === 'enable' ? 'Re-enable' : 'Disable'} "${t.name}"?`)) return;
    setTogglingId(t.id);
    try {
      await superAdminService.setTenantStatus(t.id, isSuspended ? 'ACTIVE' : 'SUSPENDED');
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, status: isSuspended ? 'ACTIVE' : 'SUSPENDED' } : x));
      toast.success(`Tenant ${action}d`);
    } catch { toast.error(`Failed to ${action} tenant`); }
    finally { setTogglingId(null); }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt('Enter new admin password (min 8 chars):');
    if (!newPassword || newPassword.length < 8) { toast.error('Password too short'); return; }
    setResettingId(id);
    try {
      await superAdminService.resetPassword(id, newPassword);
      toast.success('Password reset');
    } catch { toast.error('Failed to reset password'); }
    finally { setResettingId(null); }
  };

  const handleChangeEmail = async (newEmail: string) => {
    if (!changeEmailTarget) return;
    try {
      await superAdminService.changeAdminEmail(changeEmailTarget.id, newEmail);
      setTenants((prev) => prev.map((t) => t.id === changeEmailTarget.id
        ? { ...t, users: [{ ...t.users[0], email: newEmail }] }
        : t
      ));
      toast.success('Admin email updated');
      setChangeEmailTarget(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update email');
    }
  };

  const handleChangePlan = async (plan: 'BASIC' | 'ORDERING') => {
    if (!changePlanTarget) return;
    try {
      await superAdminService.changeTenantPlan(changePlanTarget.id, plan);
      setTenants((prev) => prev.map((t) => t.id === changePlanTarget.id ? { ...t, plan } : t));
      toast.success(`Plan updated to ${plan}`);
      setChangePlanTarget(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to update plan');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/superadmin/login');
  };

  const handleRepairDomain = async (t: TenantSummary) => {
    if (!confirm(`Re-apply DNS records for "${t.customDomain}"?\n\nThis will patch the custom hostname SNI and re-write TXT records to the tenant zone.`)) return;
    try {
      await superAdminService.repairDomain(t.id);
      toast.success(`Domain DNS repaired for ${t.customDomain}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to repair domain DNS');
    }
  };

  const handlePurgeDomainCache = async (t: TenantSummary) => {
    try {
      await superAdminService.purgeDomainCache(t.id);
      toast.success(`Domain cache purged for ${t.customDomain}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to purge domain cache');
    }
  };

  const handleExtendGrace = async (days: number) => {
    if (!extendGraceTarget) return;
    try {
      const result = await superAdminService.extendGracePeriod(extendGraceTarget.id, days);
      setTenants((prev) => prev.map((t) => t.id === extendGraceTarget.id
        ? { ...t, gracePeriodEndsAt: result.gracePeriodEndsAt, status: t.status === 'SUSPENDED' ? 'GRACE' : t.status }
        : t
      ));
      toast.success(`Grace period extended by ${days} days`);
      setExtendGraceTarget(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to extend grace period');
    }
  };

  const handleChangeCategory = async (t: TenantSummary) => {
    const isFood = t.serviceProfile === 'FOOD_SERVICE';
    const newProfile = isFood ? 'GENERAL_SERVICE' : 'FOOD_SERVICE';
    const label = newProfile === 'FOOD_SERVICE' ? 'Food & Drink' : 'Other Business';
    if (!confirm(`Switch "${t.name}" to ${label}?\n\nThis changes which features are available in their dashboard.`)) return;
    setChangingCategoryId(t.id);
    try {
      await superAdminService.changeCategory(t.id, newProfile);
      setTenants((prev) => prev.map((x) => x.id === t.id ? { ...x, serviceProfile: newProfile } : x));
      toast.success(`Switched to ${label}`);
    } catch {
      toast.error('Failed to change category');
    } finally {
      setChangingCategoryId(null);
    }
  };

  const categoryLabel = (t: TenantSummary) =>
    t.serviceProfile === 'FOOD_SERVICE' ? '🍽️ Food & Drink' : '🏢 Other';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-gray-900">ServiSite Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Tenants', value: stats.tenantCount, color: 'bg-purple-50 text-purple-700', icon: '🏢' },
            { label: 'Total Users', value: stats.userCount, color: 'bg-blue-50 text-blue-700', icon: '👤' },
            { label: 'Menu Items', value: stats.itemCount, color: 'bg-green-50 text-green-700', icon: '🍽️' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-4`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cloudflare */}
        <CloudflareCard />

        {/* Global Pricing */}
        <PricingCard />

        {/* Tenants Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
              <p className="text-sm text-gray-400 mt-0.5">{tenants.length} total</p>
            </div>
            <button
              onClick={() => setStep('pick')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              + Add Tenant
            </button>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No tenants yet</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Business', 'Slug', 'Category', 'Status', 'Plan', 'Admin Email', 'Items', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tenants.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{t.name}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{t.slug}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleChangeCategory(t)}
                          disabled={changingCategoryId === t.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 disabled:opacity-50"
                          style={t.serviceProfile === 'FOOD_SERVICE'
                            ? { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }
                            : { backgroundColor: '#ede9fe', color: '#4c1d95', borderColor: '#ddd6fe' }
                          }
                          title="Click to switch category"
                        >
                          {categoryLabel(t)}
                          <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          t.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                          t.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                          t.status === 'GRACE' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{t.status || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.plan === 'ORDERING' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>{t.plan || 'BASIC'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{t.users[0]?.email || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{t._count.menuItems}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleImpersonate(t)}
                            disabled={impersonatingId === t.id}
                            className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
                          >
                            {impersonatingId === t.id ? '...' : 'Open Dashboard'}
                          </button>
                          <TenantActionsMenu
                            tenant={t}
                            onResetPassword={() => handleResetPassword(t.id)}
                            onChangeEmail={() => setChangeEmailTarget(t)}
                            onChangePlan={() => setChangePlanTarget(t)}
                            onToggleStatus={() => handleToggleStatus(t)}
                            onPricing={() => setTenantPricingTarget(t)}
                            onSeedMenu={() => handleApplyTemplate(t)}
                            onExtendGrace={() => setExtendGraceTarget(t)}
                            onRepairDomain={() => handleRepairDomain(t)}
                            onPurgeDomainCache={() => handlePurgeDomainCache(t)}
                            onDelete={() => setDeleteTarget(t)}
                            onChangeCategory={() => handleChangeCategory(t)}
                            seedingId={seedingId}
                            resettingId={resettingId}
                            togglingId={togglingId}
                            changingCategoryId={changingCategoryId}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {tenants.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, tenants.length)} of {tenants.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                    {Array.from({ length: Math.ceil(tenants.length / PAGE_SIZE) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 text-sm rounded-lg font-medium transition-colors ${
                          p === page ? 'bg-purple-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(Math.ceil(tenants.length / PAGE_SIZE), p + 1))}
                      disabled={page === Math.ceil(tenants.length / PAGE_SIZE)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Step 1 — Template picker */}
      {step === 'pick' && (
        <TemplatePicker
          onSelect={(tmpl) => {
            setSelectedTemplate(tmpl);
            setStep('details');
          }}
        />
      )}

      {/* Step 2 — Details form */}
      {step === 'details' && selectedTemplate && (
        <AddTenantModal
          template={selectedTemplate}
          onBack={() => setStep('pick')}
          onClose={() => setStep('closed')}
          onSave={() => {
            setStep('closed');
            loadData();
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteTenantModal
          tenant={deleteTarget}
          deleting={deletingId === deleteTarget.id}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Change email modal */}
      {changeEmailTarget && (
        <ChangeEmailModal
          tenant={changeEmailTarget}
          onConfirm={handleChangeEmail}
          onCancel={() => setChangeEmailTarget(null)}
        />
      )}

      {/* Change plan modal */}
      {changePlanTarget && (
        <ChangePlanModal
          tenant={changePlanTarget}
          onConfirm={handleChangePlan}
          onCancel={() => setChangePlanTarget(null)}
        />
      )}

      {/* Tenant pricing override modal */}
      {tenantPricingTarget && (
        <TenantPricingModal
          tenant={tenantPricingTarget}
          onClose={() => setTenantPricingTarget(null)}
        />
      )}

      {/* Extend grace period modal */}
      {extendGraceTarget && (
        <ExtendGraceModal
          tenant={extendGraceTarget}
          onConfirm={handleExtendGrace}
          onCancel={() => setExtendGraceTarget(null)}
        />
      )}
    </div>
  );
}
