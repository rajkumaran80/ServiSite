import { create } from 'zustand';
import type { Tenant, TenantStats } from '../types/tenant.types';

interface TenantState {
  currentTenant: Tenant | null;
  stats: TenantStats | null;
  isLoading: boolean;
  error: string | null;
}

interface TenantActions {
  setTenant: (tenant: Tenant) => void;
  setStats: (stats: TenantStats) => void;
  clearTenant: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type TenantStore = TenantState & TenantActions;

export const useTenantStore = create<TenantStore>((set) => ({
  currentTenant: null,
  stats: null,
  isLoading: false,
  error: null,

  setTenant: (tenant) => set({ currentTenant: tenant, error: null }),
  setStats: (stats) => set({ stats }),
  clearTenant: () => set({ currentTenant: null, stats: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));

// Selector for theme settings with defaults
export const useThemeSettings = () => {
  const tenant = useTenantStore((s) => s.currentTenant);
  return {
    primaryColor: tenant?.themeSettings?.primaryColor || '#3B82F6',
    secondaryColor: tenant?.themeSettings?.secondaryColor || '#1E40AF',
    fontFamily: tenant?.themeSettings?.fontFamily || 'Inter',
  };
};
