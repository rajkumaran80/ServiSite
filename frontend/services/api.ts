import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Track in-flight refresh requests to avoid race conditions
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Sent on every request so the backend rejects calls not coming from this
    // frontend. NEXT_PUBLIC_ is required so the value is available in the
    // browser bundle (client-side axios calls). The backend skips this check
    // in development so local tools still work without configuration.
    ...(process.env.NEXT_PUBLIC_INTERNAL_SECRET
      ? { 'X-Internal-Secret': process.env.NEXT_PUBLIC_INTERNAL_SECRET }
      : {}),
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Attach tenant ID if available (for dashboard requests)
      const tenantSlug = localStorage.getItem('tenantSlug');
      if (tenantSlug) {
        config.headers['X-Tenant-ID'] = tenantSlug;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - attempt token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== 'undefined'
    ) {
      const refreshToken = localStorage.getItem('refreshToken');

      // If no refresh token or already on auth endpoints, redirect to login
      if (!refreshToken || originalRequest.url?.includes('/auth/')) {
        clearAuthData();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue requests while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = {
              ...originalRequest.headers,
              Authorization: `Bearer ${token}`,
            };
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${accessToken}`,
        };

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthData();

        if (!window.location.pathname.includes('/auth')) {
          window.location.href = `/auth/login`;
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

function clearAuthData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tenantSlug');
    localStorage.removeItem('user');
  }
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: Record<string, any>;
  success: boolean;
  message?: string;
  timestamp: string;
}

export const apiGet = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.get<ApiResponse<T>>(url, config).then((res) => res.data.data);

export const apiPost = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
  api.post<ApiResponse<T>>(url, data, config).then((res) => res.data.data);

export const apiPut = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
  api.put<ApiResponse<T>>(url, data, config).then((res) => res.data.data);

export const apiDelete = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.delete<ApiResponse<T>>(url, config).then((res) => res.data.data);

export default api;
