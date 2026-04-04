'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/auth.store';

export default function ImpersonatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { initialize } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const user = searchParams.get('user');

    if (!accessToken || !refreshToken || !user) {
      router.replace('/auth/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(decodeURIComponent(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(parsedUser));
      if (parsedUser?.tenant?.slug) {
        localStorage.setItem('tenantSlug', parsedUser.tenant.slug);
      }
      initialize();
      router.replace('/dashboard');
    } catch {
      router.replace('/auth/login');
    }
  }, [searchParams, router, initialize]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
