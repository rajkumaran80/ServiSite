'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import tenantService from '../../../services/tenant.service';
import type { TenantType } from '../../../types/tenant.types';

const BUSINESS_TYPES: { value: TenantType; label: string; icon: string }[] = [
  { value: 'RESTAURANT', label: 'Restaurant', icon: '🍽️' },
  { value: 'CAFE', label: 'Café / Coffee Shop', icon: '☕' },
  { value: 'BARBER_SHOP', label: 'Barber Shop', icon: '✂️' },
  { value: 'SALON', label: 'Hair & Beauty Salon', icon: '💇' },
  { value: 'GYM', label: 'Gym / Fitness', icon: '🏋️' },
  { value: 'REPAIR_SHOP', label: 'Repair Shop', icon: '🔧' },
  { value: 'OTHER', label: 'Other Business', icon: '🏪' },
];

const PLANS = [
  {
    id: 'basic' as const,
    name: 'Basic',
    price: '£49',
    period: '/month',
    setup: '+ £299 one-time setup',
    description: 'Professional website with menu, gallery & contact.',
    features: [
      'Custom subdomain',
      'Menu / services showcase',
      'Photo gallery',
      'WhatsApp & contact integration',
      'Custom branding',
      'Admin dashboard',
    ],
    color: 'border-gray-200 hover:border-blue-400',
    selectedColor: 'border-blue-600 bg-blue-50',
    badge: null,
  },
  {
    id: 'ordering' as const,
    name: 'Ordering',
    price: '£99',
    period: '/month',
    setup: '+ £299 one-time setup',
    description: 'Everything in Basic, plus a full online ordering system.',
    features: [
      'Everything in Basic',
      'Online ordering with cart',
      'Bundle & combo meals',
      'Item modifiers (sizes, extras)',
      'Pricing rules & discounts',
      'Real-time order notifications',
      'Email & WhatsApp order alerts',
    ],
    color: 'border-gray-200 hover:border-blue-400',
    selectedColor: 'border-blue-600 bg-blue-50',
    badge: 'Most Popular',
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

const STEPS = ['Plan', 'Business', 'Account'] as const;

function SignupForm() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') === 'ordering' ? 'ordering' : 'basic') as 'basic' | 'ordering';

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    plan: initialPlan,
    name: '',
    slug: '',
    slugEdited: false,
    type: '' as TenantType | '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });
  const [done, setDone] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, value: string) => {
    setForm((prev) => {
      const next: any = { ...prev, [key]: value };
      if (key === 'name' && !prev.slugEdited) next.slug = slugify(value);
      if (key === 'slug') {
        next.slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        next.slugEdited = true;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Business name is required';
    if (!form.slug || form.slug.length < 2) e.slug = 'At least 2 characters';
    if (!form.type) e.type = 'Please select a business type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.adminEmail.includes('@')) e.adminEmail = 'Valid email required';
    if (form.adminPassword.length < 8) e.adminPassword = 'Minimum 8 characters';
    if (form.adminPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      if (!validateStep2()) return;
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await tenantService.signup({
        name: form.name.trim(),
        slug: form.slug,
        type: form.type as TenantType,
        currency: 'GBP',
        adminEmail: form.adminEmail.toLowerCase().trim(),
        adminPassword: form.adminPassword,
      });

      // Persist chosen plan so billing page can pre-select it after login
      localStorage.setItem('selectedPlan', form.plan);
      setSignupEmail(form.adminEmail.toLowerCase().trim());
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create account. Please try again.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlanInfo = PLANS.find((p) => p.id === form.plan)!;

  // ── Success screen — check email ─────────────────────────────────────────

  if (done) {
    return (
      <div className="text-center space-y-5 py-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          <p className="text-gray-500 text-sm mt-2">
            We sent a verification link to
          </p>
          <p className="font-semibold text-gray-800 mt-1">{signupEmail}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left space-y-1.5">
          <p className="font-semibold">Before you can log in:</p>
          <p className="flex items-start gap-2">
            <span className="mt-0.5">1.</span>
            Open the email from ServiSite
          </p>
          <p className="flex items-start gap-2">
            <span className="mt-0.5">2.</span>
            Click the <strong>Verify Email Address</strong> button
          </p>
          <p className="flex items-start gap-2">
            <span className="mt-0.5">3.</span>
            You will be redirected to login
          </p>
        </div>

        <p className="text-xs text-gray-400">
          The link expires in 24 hours. Didn&apos;t receive it? Check your spam folder,
          or{' '}
          <button
            type="button"
            onClick={async () => {
              try {
                const { default: authService } = await import('../../../services/auth.service');
                await authService.resendVerification(signupEmail);
                toast.success('A new verification email has been sent.');
              } catch {
                toast.error('Failed to resend. Please try again.');
              }
            }}
            className="text-blue-600 underline"
          >
            resend it
          </button>
          .
        </p>

        <Link
          href="/auth/login"
          className="block w-full py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-colors text-sm"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < step ? 'bg-blue-600 text-white' :
              i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── Step 0: Plan ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                7-day free trial — no card needed
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setForm((p) => ({ ...p, plan: plan.id }))}
                className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                  form.plan === plan.id ? plan.selectedColor : plan.color + ' bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                      form.plan === plan.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                    }`}>
                      {form.plan === plan.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{plan.name}</span>
                        {plan.badge && (
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                      <ul className="mt-2 space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                            <svg className={`w-3 h-3 shrink-0 ${form.plan === plan.id ? 'text-blue-500' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-500">{plan.period}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{plan.setup}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
            <strong>How it works:</strong> Sign up today, trial for 7 days completely free. After the
            trial, pay a one-time £299 setup fee to keep your site live. Monthly subscription (
            {selectedPlanInfo.price}/mo) starts from month 2. You can upgrade or downgrade your plan
            any time from your dashboard.
          </div>

          <button
            onClick={handleNext}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Continue with {selectedPlanInfo.name} plan →
          </button>

          <p className="text-center text-xs text-gray-400">
            You can change your plan at any time from the dashboard.
          </p>
        </div>
      )}

      {/* ── Step 1: Business ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
            <p className="text-gray-500 text-sm mt-1">
              {selectedPlanInfo.name} plan · {selectedPlanInfo.price}/month · 7-day free trial
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
            <input
              autoFocus
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Pizza Palace"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Website Address *</label>
            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white">
              <input
                className="flex-1 px-4 py-3 text-sm outline-none"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="pizza-palace"
              />
              <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm border-l border-gray-300 whitespace-nowrap">
                .servisite.com
              </span>
            </div>
            {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug}</p>}
            {form.slug && !errors.slug && (
              <p className="text-xs text-gray-400 mt-1">
                Your site: <span className="font-medium text-blue-600">{form.slug}.servisite.com</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type', value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                    form.type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors">
              Back
            </button>
            <button onClick={handleNext} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Account ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 text-sm mt-1">This will be your dashboard login.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              autoFocus
              type="email"
              className={inputClass}
              value={form.adminEmail}
              onChange={(e) => set('adminEmail', e.target.value)}
              placeholder="you@yourbusiness.com"
            />
            {errors.adminEmail && <p className="text-xs text-red-500 mt-1">{errors.adminEmail}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              className={inputClass}
              value={form.adminPassword}
              onChange={(e) => set('adminPassword', e.target.value)}
              placeholder="Minimum 8 characters"
            />
            {errors.adminPassword && <p className="text-xs text-red-500 mt-1">{errors.adminPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type="password"
              className={inputClass}
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              placeholder="Repeat your password"
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Summary box */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-1.5">
            <p className="font-semibold text-gray-800">Order summary</p>
            <div className="flex justify-between text-gray-600">
              <span>Plan</span>
              <span className="font-medium">{selectedPlanInfo.name} ({selectedPlanInfo.price}/mo)</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>One-time setup fee</span>
              <span className="font-medium">£299</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Due today</span>
              <span className="font-bold text-green-600">£0 — free trial</span>
            </div>
            <p className="text-xs text-gray-400 pt-1 border-t border-gray-200 mt-1">
              No card needed now. Pay setup fee any time during your 7-day trial from the dashboard.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={submitting} className="flex-1 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors">
              Back
            </button>
            <button onClick={handleNext} disabled={submitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors">
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </div>

          <p className="text-xs text-center text-gray-400">
            By signing up you agree to our Terms of Service.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          ServiSite
        </Link>
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <Suspense fallback={null}>
              <SignupForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
