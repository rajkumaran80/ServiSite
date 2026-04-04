'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../../components/dashboard/Sidebar';
import BillingBanner from '../../components/dashboard/BillingBanner';
import { useAuthStore } from '../../store/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/dashboard');
    } else {
      const { user } = useAuthStore.getState();
      if (user?.role === 'SUPER_ADMIN') {
        router.replace('/superadmin');
      }
    }
  }, [isAuthenticated, isLoading, router]);

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
