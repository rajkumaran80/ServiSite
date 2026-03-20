export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenant?: {
    id: string;
    slug: string;
    name: string;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse extends TokenPair {
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
