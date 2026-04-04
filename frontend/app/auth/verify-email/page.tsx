'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import authService from '../../../services/auth.service';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const didVerify = useRef(false);

  useEffect(() => {
    if (didVerify.current) return;
    didVerify.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please use the link from your email.');
      return;
    }

    authService
      .verifyEmail(token)
      .then((result) => {
        setStatus('success');
        setMessage(result.message);
        // Redirect to login after 3 seconds
        setTimeout(() => router.push('/auth/login'), 3000);
      })
      .catch((err) => {
        setStatus('error');
        const msg =
          err?.response?.data?.message ||
          'The verification link is invalid or has expired.';
        setMessage(msg);
      });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center space-y-6">
        <div className="text-5xl">
          {status === 'verifying' ? '⏳' : status === 'success' ? '✅' : '❌'}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {status === 'verifying'
              ? 'Verifying your email...'
              : status === 'success'
              ? 'Email verified!'
              : 'Verification failed'}
          </h1>
          {status !== 'verifying' && (
            <p className="text-gray-600 mt-2 text-sm">{message}</p>
          )}
          {status === 'success' && (
            <p className="text-gray-400 text-xs mt-2">
              Redirecting to login in a moment...
            </p>
          )}
        </div>

        {status === 'success' && (
          <Link
            href="/auth/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Go to Login
          </Link>
        )}

        {status === 'error' && (
          <div className="space-y-4 w-full">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              If you already clicked this link before, your email may already be verified —
              try <Link href="/auth/login" className="font-semibold underline">logging in</Link>.
            </div>
            {resendSent ? (
              <p className="text-sm text-green-600 font-medium">
                ✅ If your email is unverified, a new link has been sent — check your inbox.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Or enter your email to get a new link:</p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  disabled={resendLoading || !resendEmail.includes('@')}
                  onClick={async () => {
                    setResendLoading(true);
                    try {
                      await authService.resendVerification(resendEmail);
                      setResendSent(true);
                    } catch {
                      toast.error('Failed to send. Please try again.');
                    } finally {
                      setResendLoading(false);
                    }
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            )}
            <Link
              href="/auth/login"
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
