'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import facebookService, { FacebookPage } from '../../../../services/facebook.service';

function FacebookCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'select' | 'saving' | 'error'>('loading');
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Facebook authorisation was cancelled or denied.');
      setStatus('error');
      return;
    }

    if (!code) {
      setError('No authorisation code received from Facebook.');
      setStatus('error');
      return;
    }

    facebookService
      .exchangeCode(code)
      .then((fetchedPages) => {
        if (fetchedPages.length === 0) {
          setError('No Facebook Pages found. Make sure you manage at least one Page.');
          setStatus('error');
        } else {
          setPages(fetchedPages);
          setStatus('select');
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to connect Facebook.');
        setStatus('error');
      });
  }, []);

  const handleSelectPage = async (page: FacebookPage) => {
    setStatus('saving');
    try {
      await facebookService.connectPage(page);
      router.push('/dashboard/settings?section=social&fb=connected');
    } catch {
      setError('Failed to save page selection.');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Connecting to Facebook…</p>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Saving page connection…</p>
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
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          Back to Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-md">
        {/* Facebook logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#1877F2' }}>
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Select your Facebook Page</h1>
            <p className="text-sm text-gray-500">Choose the page you want to post to</p>
          </div>
        </div>

        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelectPage(page)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                {page.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{page.name}</p>
                <p className="text-xs text-gray-500">{page.category}</p>
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

export default function FacebookCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FacebookCallbackContent />
    </Suspense>
  );
}
