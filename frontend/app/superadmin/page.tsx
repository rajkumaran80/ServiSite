'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import superAdminService, { TenantSummary, CreateTenantPayload } from '../../services/superadmin.service';
import { BUSINESS_TEMPLATES, BusinessTemplate } from '../../config/templates';

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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
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

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/superadmin/login'); return; }
    if (user?.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
    loadData();
  }, [isAuthenticated, user]);

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

  const [seedingId, setSeedingId] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

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

  const typeLabel: Record<string, string> = {
    RESTAURANT: '🍽️ Restaurant',
    CAFE: '☕ Café',
    BARBER_SHOP: '✂️ Barber Shop',
    SALON: '💅 Salon',
    GYM: '💪 Gym',
    REPAIR_SHOP: '🔧 Repair Shop',
    OTHER: '🏢 Other',
  };

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
            <button
              onClick={() => setStep('pick')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add Tenant
            </button>
          </div>

          {tenants.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No tenants yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Business', 'Slug', 'Type', 'Status', 'Plan', 'Admin Email', 'Items', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                      <td className="px-4 py-3 text-gray-600">{typeLabel[t.type] || t.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          t.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                          t.status === 'SUSPENDED' ? 'bg-red-100 text-red-700' :
                          t.status === 'GRACE' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{t.status || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.plan === 'ORDERING' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                        }`}>{t.plan || 'BASIC'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.users[0]?.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{t._count.menuItems}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleImpersonate(t)}
                            disabled={impersonatingId === t.id}
                            className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {impersonatingId === t.id ? '...' : 'Open Dashboard'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(t.id)}
                            disabled={resettingId === t.id}
                            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {resettingId === t.id ? '...' : 'Reset PW'}
                          </button>
                          <button
                            onClick={() => setChangeEmailTarget(t)}
                            className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded-lg transition-colors"
                          >
                            Change Email
                          </button>
                          <button
                            onClick={() => setChangePlanTarget(t)}
                            className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                          >
                            Change Plan
                          </button>
                          <button
                            onClick={() => handleToggleStatus(t)}
                            disabled={togglingId === t.id}
                            className={`text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                              t.status === 'SUSPENDED'
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {togglingId === t.id ? '...' : t.status === 'SUSPENDED' ? 'Enable' : 'Disable'}
                          </button>
                          <button
                            onClick={() => setTenantPricingTarget(t)}
                            className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition-colors"
                          >
                            Pricing
                          </button>
                          <button
                            onClick={() => handleApplyTemplate(t)}
                            disabled={seedingId === t.id}
                            className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {seedingId === t.id ? '...' : 'Seed Menu'}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            disabled={deletingId === t.id}
                            className="text-xs px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
