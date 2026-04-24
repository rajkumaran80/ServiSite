'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../store/auth.store';

// Client-side wrapper to prevent SSR issues
function useClientSideValue<T>(value: T): T | undefined {
  const [clientValue, setClientValue] = useState<T | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    setClientValue(value);
  }, [value]);
  
  return isMounted ? clientValue : undefined;
}

// Safe auth store hook that prevents SSR access
function useSafeAuthStore() {
  const [isMounted, setIsMounted] = useState(false);
  const authStore = useAuthStore();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return {
      login: authStore.login,
      isAuthenticated: false,
      user: null,
    };
  }
  
  return authStore;
}

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useSafeAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') router.replace('/superadmin');
  }, [isAuthenticated, user]);

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">S</div>
            <h1 className="text-2xl font-bold text-gray-900">ServiSite Admin</h1>
            <p className="text-gray-500 mt-1 text-sm">Platform administration</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded-lg"></div>
              <div className="h-10 bg-gray-200 rounded-lg"></div>
              <div className="h-10 bg-purple-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // After login, check role
      const { user: u } = useAuthStore.getState();
      if (u?.role !== 'SUPER_ADMIN') {
        toast.error('Not a super admin account');
        useAuthStore.getState().logout();
        return;
      }
      toast.success('Welcome, Admin');
      router.replace('/superadmin');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">S</div>
          <h1 className="text-2xl font-bold text-gray-900">ServiSite Admin</h1>
          <p className="text-gray-500 mt-1 text-sm">Platform administration</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="superadmin@servisite.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
