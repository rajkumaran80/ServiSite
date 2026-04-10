'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../../store/auth.store';
import tenantService from '../../services/tenant.service';
import { api } from '../../services/api';
import type { TenantStats, Tenant } from '../../types/tenant.types';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.com';
  const isLocalDev = APP_DOMAIN === 'localhost';
  const tenantUrl = (slug: string) =>
    isLocalDev
      ? `http://${slug}.localhost:3000`
      : `https://${slug}.${APP_DOMAIN}`;

  useEffect(() => {
    if (!user?.tenantId) return;

    const loadData = async () => {
      try {
        const [tenantRes, statsData] = await Promise.all([
          api.get<{ data: Tenant }>('/tenant/current'),
          tenantService.getStats(user.tenantId),
        ]);
        setTenant(tenantRes.data.data);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.tenantId]);

  const statCards = [
    {
      label: 'Menu Items',
      value: stats?.menuItems ?? 0,
      icon: '🍽️',
      href: '/dashboard/menu',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Categories',
      value: stats?.categories ?? 0,
      icon: '📂',
      href: '/dashboard/menu',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Gallery Images',
      value: stats?.galleryImages ?? 0,
      icon: '📸',
      href: '/dashboard/gallery',
      color: 'bg-green-50 text-green-600',
    },
  ];

  const quickActions = [
    { label: 'Add Menu Item', href: '/dashboard/menu', icon: '➕', desc: 'Add a new dish or service' },
    { label: 'Upload Photo', href: '/dashboard/gallery', icon: '🖼️', desc: 'Add to your gallery' },
    { label: 'Update Settings', href: '/dashboard/settings', icon: '⚙️', desc: 'Customize your page' },
    {
      label: 'View Your Page',
      href: tenant ? tenantUrl(tenant.slug) : '#',
      icon: '🌐',
      desc: 'See your public page',
      external: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening with your business page.
        </p>
      </div>

      {/* Public URL Banner */}
      {tenant && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div>
              <p className="text-sm font-medium text-blue-900">Your public page</p>
              <p className="text-blue-600 text-sm font-mono">
                {isLocalDev ? `${tenant.slug}.localhost:3000` : `${tenant.slug}.${APP_DOMAIN}`}
              </p>
            </div>
          </div>
          <a
            href={tenantUrl(tenant.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Page →
          </a>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${card.color} mb-4`}>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-gray-500 text-sm mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group"
            >
              <span className="text-3xl mb-3 block">{action.icon}</span>
              <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                {action.label}
              </p>
              <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
