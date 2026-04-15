'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../../store/auth.store';
import authService from '../../../services/auth.service';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const { login, isAuthenticated, isLoading, initialize } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const { user: u } = useAuthStore.getState();
      router.replace(u?.role === 'SUPER_ADMIN' ? '/superadmin' : redirect);
    }
  }, [isAuthenticated, isLoading, router, redirect]);

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setEmailNotVerified(false);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      const { user: u } = useAuthStore.getState();
      router.push(u?.role === 'SUPER_ADMIN' ? '/superadmin' : redirect);
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Invalid email or password';
      if (message === 'EMAIL_NOT_VERIFIED') {
        setEmailNotVerified(true);
        setUnverifiedEmail(data.email);
      } else {
        setError('root', { message });
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const result = await authService.googleLogin(credentialResponse.credential);
      authService.saveTokens(result.accessToken, result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('tenantSlug', result.user?.tenant?.slug || '');
      await initialize();
      toast.success('Welcome back!');
      const { user: u } = useAuthStore.getState();
      router.push(u?.role === 'SUPER_ADMIN' ? '/superadmin' : redirect);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Google login failed. Please try again.';
      toast.error(msg);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { toast.error('Enter your email address'); return; }
    setForgotLoading(true);
    try {
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await authService.resendVerification(unverifiedEmail);
      toast.success('Verification email sent! Check your inbox.');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-bold text-blue-600">ServiSite</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-5">

          {/* Email not verified banner */}
          {emailNotVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-3">
              <p className="font-semibold">Email not verified</p>
              <p>Please check your inbox for a verification link. You must verify your email before logging in.</p>
              <button
                type="button"
                disabled={resendLoading}
                onClick={handleResendVerification}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          {/* Google login */}
          {googleClientId && (
            <GoogleOAuthProvider clientId={googleClientId}>
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google login failed')}
                  width="100%"
                  text="signin_with"
                  shape="rectangular"
                  theme="outline"
                />
              </div>
            </GoogleOAuthProvider>
          )}

          {googleClientId && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">or sign in with email</span>
              </div>
            </div>
          )}

          {/* Forgot password mode */}
          {forgotMode ? (
            <div className="space-y-4">
              {forgotSent ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 space-y-2">
                  <p className="font-semibold">Check your email</p>
                  <p>We sent a password reset link to <span className="font-medium">{forgotEmail}</span>. It expires in 1 hour.</p>
                  <button onClick={() => { setForgotMode(false); setForgotSent(false); }} className="text-blue-600 hover:underline text-xs font-medium">Back to sign in</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                      autoFocus
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {forgotLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</> : 'Send reset link'}
                  </button>
                  <button onClick={() => setForgotMode(false)} className="w-full text-sm text-gray-500 hover:text-gray-700">← Back to sign in</button>
                </>
              )}
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errors.root.message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className={`w-full px-4 py-3 border rounded-xl text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot password?</button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className={`w-full px-4 py-3 pr-12 border rounded-xl text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
