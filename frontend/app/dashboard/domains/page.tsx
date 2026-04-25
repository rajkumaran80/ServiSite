'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface CustomHostname {
  hostname: string;
  status: 'pending' | 'active' | 'deleted';
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  ssl?: {
    status: string;
    validation_records?: Array<{
      type: string;
      name: string;
      value: string;
    }>;
  };
}

interface DomainStatus {
  hostname: string;
  status: 'pending' | 'active' | 'deleted';
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  ssl?: {
    status: string;
    validation_records?: Array<{
      type: string;
      name: string;
      value: string;
    }>;
  };
}

export default function DomainSettingsPage() {
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [showInstructions, setShowInstructions] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      // First try to get from DNS database
      const res = await fetch(`${API_URL}/dns/zone`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.dnsRecords) {
          // Transform DNS records to domain status format
          const domainRecords = data.data.dnsRecords.reduce((acc: any[], record: any) => {
            const existingDomain = acc.find(d => d.hostname === record.hostname);
            if (!existingDomain) {
              acc.push({
                hostname: record.hostname,
                status: record.status,
                ownership_verification: record.isOwnershipVerification ? {
                  type: record.recordType,
                  name: record.name,
                  value: record.value,
                } : undefined,
                ssl: record.isSSLValidation && data.data.customDomainStatus === 'active' ? {
                  status: 'active',
                  validation_records: [record].map(r => ({
                    type: r.recordType,
                    name: r.name,
                    value: r.value,
                  }))
                } : undefined,
              });
            }
            return acc;
          }, []);
          setDomains(domainRecords);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch domains');
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) {
      toast.error('Please enter a domain name');
      return;
    }

    setAddingDomain(true);
    try {
      const res = await fetch(`${API_URL}/cloudflare/custom-hostnames`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostname: newDomain.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Domain added successfully!');
        setNewDomain('');
        setShowInstructions(newDomain.trim());
        await fetchDomains();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to add domain');
      }
    } catch (error) {
      toast.error('Failed to add domain');
    } finally {
      setAddingDomain(false);
    }
  };

  const deleteDomain = async (hostname: string) => {
    if (!confirm(`Are you sure you want to remove ${hostname}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cloudflare/custom-hostnames`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostname }),
      });

      if (res.ok) {
        toast.success('Domain removed successfully!');
        await fetchDomains();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to remove domain');
      }
    } catch (error) {
      toast.error('Failed to remove domain');
    }
  };

  const clearAllDomains = async () => {
    if (!confirm('Are you sure you want to remove all custom domains? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cloudflare/custom-hostnames/all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Removed ${data.data.deletedCount} domains successfully!`);
        await fetchDomains();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to clear domains');
      }
    } catch (error) {
      toast.error('Failed to clear domains');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      deleted: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Domain Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage custom domains for your site. Add your domain and follow the verification instructions.
        </p>
      </div>

      {/* Add New Domain */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Domain</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g., coffee.co.uk"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addDomain}
            disabled={addingDomain || !newDomain.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingDomain ? 'Adding...' : 'Add Domain'}
          </button>
        </div>
      </div>

      {/* Domain Instructions */}
      {showInstructions && (
        <DomainInstructions
          hostname={showInstructions}
          domains={domains}
          onClose={() => setShowInstructions(null)}
        />
      )}

      {/* Current Domains */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Current Domains</h2>
            {domains.length > 0 && (
              <button
                onClick={clearAllDomains}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Disconnect All
              </button>
            )}
          </div>
        </div>
        
        {domains.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <p>No custom domains added yet</p>
            <p className="text-sm mt-2">Add your first custom domain to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {domains.map((domain) => (
              <div key={domain.hostname} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900">{domain.hostname}</h3>
                      {getStatusBadge(domain.status)}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {domain.status === 'pending' && 'Verification in progress...'}
                      {domain.status === 'active' && 'Domain is active and ready'}
                      {domain.status === 'deleted' && 'Domain has been removed'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowInstructions(domain.hostname)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View Instructions
                    </button>
                    <button
                      onClick={() => deleteDomain(domain.hostname)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DomainInstructions({ hostname, domains, onClose }: { 
  hostname: string; 
  domains: DomainStatus[]; 
  onClose: () => void;
}) {
  const domain = domains.find(d => d.hostname === hostname);
  
  if (!domain) return null;

  const isVerified = domain.status === 'active';
  const hasOwnershipRecords = domain.ownership_verification;
  const hasSSLRecords = domain.ssl?.validation_records;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-900">Setup Instructions for {hostname}</h3>
        <button
          onClick={onClose}
          className="text-blue-600 hover:text-blue-700"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isVerified ? (
        <div className="space-y-4">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg">
            <p className="font-medium">✅ Domain is verified and active!</p>
            <p className="text-sm mt-1">Your domain is ready to use. No further action needed.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Final DNS Records</h4>
            <p className="text-sm text-gray-600 mb-3">Point your domain to Cloudflare:</p>
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">{hostname}</span>
                <span className="text-sm text-gray-600">→ CNAME to servisite.co.uk</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">www.{hostname}</span>
                <span className="text-sm text-gray-600">→ CNAME to servisite.co.uk</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Ownership Verification */}
          {hasOwnershipRecords && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Step 1: Security & Ownership (Add these first)</h4>
              <p className="text-sm text-gray-600 mb-3">
                Before we can secure your site, you must add these TXT records in your domain registrar (e.g., IONOS, GoDaddy, etc.).
              </p>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-2 font-mono">TXT</td>
                      <td className="px-4 py-2 font-mono">{domain.ownership_verification?.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{domain.ownership_verification?.value}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: SSL Validation */}
          {hasSSLRecords && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Step 2: SSL Certificate Validation</h4>
              <p className="text-sm text-gray-600 mb-3">
                Add these TXT records to enable SSL certificate issuance:
              </p>
              <div className="bg-white rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.ssl?.validation_records?.map((record, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 font-mono">{record.type}</td>
                        <td className="px-4 py-2 font-mono">{record.name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{record.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg">
            <p className="font-medium">⏳ Verification in Progress</p>
            <p className="text-sm mt-1">
              We're checking your DNS records. This usually takes 5-15 minutes. 
              This page will automatically update when verification is complete.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
