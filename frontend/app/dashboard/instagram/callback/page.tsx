'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import instagramService, { InstagramAccount } from '../../../../services/instagram.service';

function InstagramCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'select' | 'saving' | 'error'>('loading');
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const state = searchParams.get('state'); // tenant slug

    if (errorParam) {
      setError('Instagram authorisation was cancelled or denied.');
      setStatus('error');
      return;
    }

    if (!code) {
      setError('No authorisation code received from Instagram.');
      setStatus('error');
      return;
    }

    // Bridge: if on main domain, redirect to tenant subdomain with code
    const hostname = window.location.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.co.uk';
    const isMainDomain = hostname === appDomain || hostname === `www.${appDomain}`;
    if (isMainDomain && state) {
      const params = new URLSearchParams({ code });
      window.location.href = `https://${state}.${appDomain}/dashboard/instagram/callback?${params.toString()}`;
      return;
    }

    instagramService
      .exchangeCode(code)
      .then((fetchedAccounts) => {
        if (fetchedAccounts.length === 0) {
          setError('No Instagram accounts found.');
          setStatus('error');
        } else if (fetchedAccounts.length === 1) {
          // Auto-connect if only one account
          return instagramService.connectAccount(fetchedAccounts[0]).then(() => {
            router.push('/dashboard/settings?section=social&ig=connected');
          });
        } else {
          setAccounts(fetchedAccounts);
          setStatus('select');
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to connect Instagram.');
        setStatus('error');
      });
  }, []);

  const handleSelectAccount = async (account: InstagramAccount) => {
    setStatus('saving');
    try {
      await instagramService.connectAccount(account);
      router.push('/dashboard/settings?section=social&ig=connected');
    } catch {
      setError('Failed to save account selection.');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Connecting to Instagram…</p>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Saving account connection…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-red-600 font-medium text-center">{error}</p>
        <button
          onClick={() => router.push('/dashboard/settings?section=social')}
          className="px-5 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium"
        >
          Back to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Select your Instagram Account</h1>
            <p className="text-sm text-gray-500">Choose the account to connect</p>
          </div>
        </div>

        <div className="space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSelectAccount(account)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold flex-shrink-0">
                {account.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">@{account.username}</p>
                <p className="text-xs text-gray-500">Instagram Business Account</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push('/dashboard/settings?section=social')}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InstagramCallbackContent />
    </Suspense>
  );
}
