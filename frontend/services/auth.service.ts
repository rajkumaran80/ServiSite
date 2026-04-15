import { api } from './api';
import type { LoginPayload, LoginResponse, TokenPair } from '../types/auth.types';

class AuthService {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await api.post<{ data: LoginResponse; success: boolean }>(
      '/auth/login',
      payload,
    );
    return response.data.data;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const response = await api.post<{ data: TokenPair; success: boolean }>(
      '/auth/refresh',
      { refreshToken },
    );
    return response.data.data;
  }

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  }

  async me() {
    const response = await api.get<{ data: any; success: boolean }>('/auth/me');
    return response.data.data;
  }

  async googleLogin(idToken: string): Promise<LoginResponse> {
    const response = await api.post<{ data: LoginResponse; success: boolean }>(
      '/auth/google',
      { idToken },
    );
    return response.data.data;
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.get<{ data: { message: string }; success: boolean }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
    return response.data.data;
  }

  async resendVerification(email: string): Promise<void> {
    await api.post('/auth/resend-verification', { email });
  }

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword });
  }

  saveTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Set cookie so middleware can detect auth on the server side
      document.cookie = `auth-token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
    }
  }

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tenantSlug');
      // Clear the auth cookie
      document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
    }
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }
}

export const authService = new AuthService();
export default authService;
