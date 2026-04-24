'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/auth.store';

function ImpersonateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTokens, setUser, clearAuth } = useAuthStore();

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
      // Clear any existing session (e.g. superadmin) before setting impersonated state
      clearAuth();
      setTokens(accessToken, refreshToken);
      setUser(parsedUser);
      if (parsedUser?.tenant?.slug) {
        localStorage.setItem('tenantSlug', parsedUser.tenant.slug);
      }
      router.replace('/dashboard');
    } catch {
      router.replace('/auth/login');
    }
  }, [searchParams, router, setTokens, setUser, clearAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ImpersonateContent />
    </Suspense>
  );
}
