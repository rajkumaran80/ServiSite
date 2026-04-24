'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../../components/dashboard/Sidebar';
import BillingBanner from '../../components/dashboard/BillingBanner';
import { useAuthStore } from '../../store/auth.store';
import { useTenantStore } from '../../store/tenant.store';
import { api } from '../../services/api';
import type { Tenant } from '../../types/tenant.types';

// Safe auth store hook that prevents SSR access
function useSafeAuthStore() {
  const [isMounted, setIsMounted] = useState(false);
  const authStore = useAuthStore();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return {
      isAuthenticated: false,
      isLoading: false,
      initialize: authStore.initialize,
    };
  }
  
  return authStore;
}

// Safe tenant store hook that prevents SSR access
function useSafeTenantStore() {
  const [isMounted, setIsMounted] = useState(false);
  const tenantStore = useTenantStore();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return {
      setTenant: tenantStore.setTenant,
    };
  }
  
  return tenantStore;
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useSafeAuthStore();
  const { setTenant } = useSafeTenantStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    initialize();
  }, [initialize, isClient]);

  useEffect(() => {
    if (!isClient || !isAuthenticated) return;
    api.get<{ data: Tenant }>('/tenant/current')
      .then((res) => setTenant(res.data.data))
      .catch(() => {});
  }, [isAuthenticated, isClient]);

  useEffect(() => {
    if (!isClient || isLoading) return;
    if (!isAuthenticated) {
      const qs = searchParams.toString();
      const full = pathname + (qs ? `?${qs}` : '');
      router.replace(`/auth/login?redirect=${encodeURIComponent(full)}`);
    } else {
      const { user } = useAuthStore.getState();
      if (user?.role === 'SUPER_ADMIN') {
        router.replace('/superadmin');
      }
    }
  }, [isAuthenticated, isLoading, router, isClient]);

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <BillingBanner />
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
