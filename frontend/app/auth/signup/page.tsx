'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import tenantService from '../../../services/tenant.service';
import type { TenantType } from '../../../types/tenant.types';

const BUSINESS_TYPES: { value: TenantType; label: string; icon: string; description: string }[] = [
  { value: 'RESTAURANT', label: 'Food & Drink', icon: '🍽️', description: 'Restaurant, café, bakery, food truck — includes full menu management' },
  { value: 'OTHER', label: 'Other Business', icon: '🏢', description: 'Salon, barber, gym, repair shop — page builder & services' },
];

// PLANS kept for future multi-plan support — not used in current signup flow
// const PLANS = [
//   { id: 'basic', name: 'Basic', price: '£49', period: '/month', ... },
//   { id: 'ordering', name: 'Ordering', price: '£99', period: '/month', ... },
// ];

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

const STEPS = ['Business', 'Account'] as const;

function SignupForm() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState({
    plan: 'ordering' as 'ordering' | 'basic', // kept for future plans; always ordering for now
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

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Business name is required';
    if (!form.slug || form.slug.length < 2) e.slug = 'At least 2 characters';
    if (!form.type) e.type = 'Please select a business type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.adminEmail.includes('@')) e.adminEmail = 'Valid email required';
    if (form.adminPassword.length < 8) e.adminPassword = 'Minimum 8 characters';
    if (form.adminPassword !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1) {
      if (!validateStep1()) return;
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

      setSignupEmail(form.adminEmail.toLowerCase().trim());
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create account. Please try again.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* ── Step 0: Business ── */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
            <p className="text-gray-500 text-sm mt-1">
              Get your professional website live in minutes.
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Category *</label>
            <div className="grid grid-cols-1 gap-3">
              {BUSINESS_TYPES.map(({ value, label, icon, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('type', value)}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors ${
                    form.type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="text-2xl mt-0.5">{icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  </div>
                  {form.type === value && (
                    <svg className="w-5 h-5 text-blue-500 ml-auto flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
          </div>

          <button
            onClick={handleNext}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 1: Account ── */}
      {step === 1 && (
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputClass + ' pr-12'}
                value={form.adminPassword}
                onChange={(e) => set('adminPassword', e.target.value)}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.adminPassword && <p className="text-xs text-red-500 mt-1">{errors.adminPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className={inputClass + ' pr-12'}
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Summary box */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-800">Pricing summary</p>
            <div className="flex justify-between text-gray-600">
              <span>Registration fee</span>
              <span className="font-medium">£299 <span className="text-gray-400 text-xs">(includes 1st month)</span></span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Monthly from month 2</span>
              <span className="font-medium">£49/month</span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-200">
              <span>Due today</span>
              <span className="font-bold text-green-600">£0 — free trial</span>
            </div>
            <p className="text-xs text-gray-400 pt-0.5">
              Includes online ordering for all customers. Pay registration fee any time from your dashboard.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} disabled={submitting} className="flex-1 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors">
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
