'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBillingStatus } from '../../services/billing.service';
import type { BillingStatus, TenantStatus } from '../../types/billing.types';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function BillingBanner() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    getBillingStatus()
      .then(setBilling)
      .catch(() => {});
  }, []);

  if (!billing) return null;

  const { status, registrationFeePaid, trialEndsAt, gracePeriodEndsAt } = billing;

  if (status === 'ACTIVE') return null;

  let message = '';
  let urgency: 'info' | 'warning' | 'danger' = 'info';

  if (status === 'SUSPENDED') {
    message = 'Your account is suspended. Please pay the registration fee to reactivate.';
    urgency = 'danger';
  } else if (status === 'TRIAL') {
    const days = daysUntil(trialEndsAt);
    if (days !== null && days <= 3) {
      message = `Free trial ends in ${days} day${days !== 1 ? 's' : ''}. Pay the registration fee to continue.`;
      urgency = 'warning';
    } else if (days !== null) {
      message = `Free trial: ${days} day${days !== 1 ? 's' : ''} remaining. Register to avoid interruption.`;
      urgency = 'info';
    }
  } else if (status === 'GRACE') {
    const days = daysUntil(gracePeriodEndsAt);
    if (days !== null && days <= 3) {
      message = `Account will be suspended in ${days} day${days !== 1 ? 's' : ''}! Pay the registration fee now.`;
      urgency = 'danger';
    } else if (days !== null) {
      message = `Grace period: ${days} day${days !== 1 ? 's' : ''} left to pay the registration fee.`;
      urgency = 'warning';
    }
  }

  if (!message) return null;

  const colours = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };

  const btnColours = {
    info: 'bg-blue-600 hover:bg-blue-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    danger: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <div className={`border rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-4 ${colours[urgency]}`}>
      <p className="text-sm font-medium">{message}</p>
      <Link
        href="/dashboard/billing"
        className={`shrink-0 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${btnColours[urgency]}`}
      >
        {registrationFeePaid ? 'Manage Billing' : 'Pay Now'}
      </Link>
    </div>
  );
}
