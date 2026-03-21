import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthState } from '../types/auth.types';
import authService from '../services/auth.service';

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  initialize: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authService.login({ email, password });

          authService.saveTokens(response.accessToken, response.refreshToken);

          // Save tenant slug for API requests
          if (response.user.tenant?.slug && typeof window !== 'undefined') {
            localStorage.setItem('tenantSlug', response.user.tenant.slug);
          }

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await authService.logout(refreshToken);
          }
        } catch {
          // Continue with local cleanup even if server logout fails
        } finally {
          authService.clearTokens();
          set({ ...initialState, isLoading: false });
        }
      },

      setUser: (user: User) => set({ user, isAuthenticated: true }),

      setTokens: (accessToken: string, refreshToken: string) => {
        authService.saveTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        authService.clearTokens();
        set({ ...initialState, isLoading: false });
      },

      initialize: async () => {
        // Already authenticated (e.g. just logged in) — skip re-initialization
        const { isAuthenticated, user } = get();
        if (isAuthenticated && user) return;

        set({ isLoading: true });
        try {
          const token = authService.getAccessToken();

          if (!token) {
            set({ ...initialState, isLoading: false });
            return;
          }

          if (authService.isTokenExpired(token)) {
            const refreshToken = authService.getRefreshToken();
            if (!refreshToken) {
              set({ ...initialState, isLoading: false });
              return;
            }

            try {
              const tokens = await authService.refresh(refreshToken);
              authService.saveTokens(tokens.accessToken, tokens.refreshToken);
              set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
            } catch {
              authService.clearTokens();
              set({ ...initialState, isLoading: false });
              return;
            }
          }

          // Fetch current user
          const user = await authService.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          authService.clearTokens();
          set({ ...initialState, isLoading: false });
        }
      },
    }),
    {
      name: 'servisite-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
