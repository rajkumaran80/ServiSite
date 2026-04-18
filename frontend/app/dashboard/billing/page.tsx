'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getBillingStatus,
  getRegistrationCheckoutUrl,
  getSubscriptionCheckoutUrl,
  getPortalUrl,
  getConnectOnboardingUrl,
  // changePlan kept for future multi-plan support
} from '../../../services/billing.service';
import { api } from '../../../services/api';
import type { BillingStatus, BillingPlan } from '../../../types/billing.types';

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    TRIAL: 'bg-blue-100 text-blue-800',
    GRACE: 'bg-amber-100 text-amber-800',
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colours[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // highlightPlan kept for future multi-plan support
  // const [highlightPlan, setHighlightPlan] = useState<BillingPlan | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);

  useEffect(() => {
    getBillingStatus()
      .then(setBilling)
      .catch(() => toast.error('Failed to load billing status'))
      .finally(() => setLoading(false));
    // Load saved whatsapp number from tenant
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.tenantId) {
      api.get<{ data: any }>(`/tenant/current`).then(r => {
        if (r.data.data?.whatsappNumber) setWhatsapp(r.data.data.whatsappNumber);
      }).catch(() => {});
    }
  }, []);

  async function saveWhatsapp() {
    if (!whatsapp.trim()) return;
    setWhatsappSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await api.put(`/tenant/${user.tenantId}`, { whatsappNumber: whatsapp.trim() });
      toast.success('WhatsApp number saved');
    } catch {
      toast.error('Failed to save number');
    } finally {
      setWhatsappSaving(false);
    }
  }

  async function handleAction(key: string, fn: () => Promise<{ url: string }>) {
    setActionLoading(key);
    try {
      const { url } = await fn();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!billing) return null;

  const trialDays = daysUntil(billing.trialEndsAt);
  const graceDays = daysUntil(billing.gracePeriodEndsAt);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your ServiSite plan and payments.</p>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Account Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Status</p>
            <div className="mt-1"><StatusBadge status={billing.status} /></div>
          </div>
          <div>
            <p className="text-gray-500">Registration Fee</p>
            <p className="font-medium mt-1">
              {billing.registrationFeePaid ? (
                <span className="text-green-600">Paid</span>
              ) : (
                <span className="text-red-600">Unpaid (£299)</span>
              )}
            </p>
          </div>
          {billing.status === 'TRIAL' && trialDays !== null && (
            <div>
              <p className="text-gray-500">Trial ends</p>
              <p className="font-medium mt-1">
                {formatDate(billing.trialEndsAt)}
                <span className="text-gray-400 ml-1">({trialDays}d left)</span>
              </p>
            </div>
          )}
          {billing.status === 'GRACE' && graceDays !== null && (
            <div>
              <p className="text-gray-500">Grace period ends</p>
              <p className="font-medium mt-1 text-amber-600">
                {formatDate(billing.gracePeriodEndsAt)}
                <span className="ml-1">({graceDays}d left)</span>
              </p>
            </div>
          )}
          {billing.status === 'SUSPENDED' && (
            <div>
              <p className="text-gray-500">Suspended at</p>
              <p className="font-medium mt-1 text-red-600">{formatDate(billing.suspendedAt)}</p>
            </div>
          )}
          {billing.stripeSubscriptionId && (
            <div>
              <p className="text-gray-500">Current period ends</p>
              <p className="font-medium mt-1">{formatDate(billing.currentPeriodEnd)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Fee */}
      {!billing.registrationFeePaid && (
        <div className="bg-white rounded-xl border border-red-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Complete Registration</h2>
          <p className="text-sm text-gray-600">
            Pay the one-time registration fee of <strong>£299</strong> to keep your website running.
            Monthly billing starts from the 2nd month.
          </p>
          <button
            disabled={actionLoading === 'registration'}
            onClick={() => handleAction('registration', getRegistrationCheckoutUrl)}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            {actionLoading === 'registration' ? 'Redirecting...' : 'Pay Registration Fee — £299'}
          </button>
        </div>
      )}

      {/* Monthly Subscription */}
      {billing.registrationFeePaid && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Monthly Subscription</h2>
          {billing.stripeSubscriptionId ? (
            <div className="space-y-4">
              {/* Active subscription */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600">Current plan:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                  ServiSite — £49/mo
                </span>
              </div>
              <ul className="space-y-1.5">
                {['Professional website', 'Menu & services showcase', 'Photo & video gallery', 'Online ordering', 'WhatsApp & contact integration', 'Admin dashboard'].map((f) => (
                  <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {/* Stripe portal link */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">Update payment method, view invoices, or cancel subscription</p>
                <button
                  disabled={actionLoading === 'portal'}
                  onClick={() => handleAction('portal', getPortalUrl)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-60 whitespace-nowrap ml-3"
                >
                  {actionLoading === 'portal' ? 'Redirecting...' : 'Billing portal →'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Start your monthly subscription to keep your site running after the first month.
              </p>
              {/* Single plan */}
              <div className="border border-blue-300 ring-2 ring-blue-100 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">ServiSite</p>
                    <p className="text-2xl font-bold text-blue-600 mt-0.5">£49<span className="text-sm font-normal text-gray-500">/month</span></p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-full">Everything included</span>
                </div>
                <ul className="space-y-1.5">
                  {['Professional website', 'Menu & services showcase', 'Photo & video gallery', 'Online ordering', 'WhatsApp & contact integration', 'Admin dashboard'].map((f) => (
                    <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={actionLoading === 'sub-ordering'}
                  onClick={() => handleAction('sub-ordering', () => getSubscriptionCheckoutUrl('ordering' as BillingPlan))}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
                >
                  {actionLoading === 'sub-ordering' ? 'Redirecting...' : 'Subscribe — £49/month'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Number */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">WhatsApp Notifications</h2>
        <p className="text-sm text-gray-600">
          Add your WhatsApp number to receive instant order alerts. Include country code (e.g. +447911123456).
        </p>
        <div className="flex gap-2">
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+447911123456"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={whatsappSaving || !whatsapp.trim()}
            onClick={saveWhatsapp}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {whatsappSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Stripe Connect */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Receive Payments (Stripe Connect)</h2>
        <p className="text-sm text-gray-600">
          Connect a bank account to receive online order payouts. ServiSite takes a 5% platform fee;
          the rest is transferred to your account after each order.
        </p>
        {billing.stripeConnectId ? (
          <p className="text-sm text-green-600 font-medium">Connected — account {billing.stripeConnectId.slice(0, 16)}…</p>
        ) : (
          <button
            disabled={actionLoading === 'connect'}
            onClick={() => handleAction('connect', getConnectOnboardingUrl)}
            className="bg-[#635BFF] hover:bg-[#4F46E5] disabled:opacity-60 text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            {actionLoading === 'connect' ? 'Redirecting...' : 'Connect with Stripe'}
          </button>
        )}
      </div>
    </div>
  );
}
