import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — ServiSite',
  description: 'Privacy Policy for ServiSite and its connected services.',
};

export default function PrivacyPolicyPage() {
  const lastUpdated = '17 April 2026';

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xl">ServiSite</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <p>
              ServiSite (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the ServiSite platform available at{' '}
              <strong>servisite.co.uk</strong> and associated subdomains. This Privacy Policy explains how we collect,
              use, and protect information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly to us:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li><strong>Account information</strong> — name, email address, and password when you register</li>
              <li><strong>Business information</strong> — business name, address, phone number, and opening hours</li>
              <li><strong>Content</strong> — menu items, images, and other content you upload to the platform</li>
              <li><strong>Payment information</strong> — processed securely via Stripe; we do not store card details</li>
              <li><strong>Communications</strong> — messages you send us via email or contact forms</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Facebook Integration</h2>
            <p className="mb-3">
              If you choose to connect your Facebook Page to ServiSite, we request the following permissions:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">pages_show_list</code> — to identify which Pages you manage</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">pages_read_engagement</code> — to read basic page information</li>
              <li><code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">pages_manage_posts</code> — to publish posts to your Page on your behalf</li>
            </ul>
            <p className="mt-3 text-sm">
              We store only the Page access token necessary to post on your behalf. We do not access your personal
              Facebook profile, friends list, or any data beyond the permissions listed. You can disconnect your
              Facebook Page at any time from <strong>Settings → Social</strong> in your dashboard.
            </p>
            <p className="mt-3 text-sm">
              Data obtained through Facebook permissions is used solely to publish content you explicitly request
              and is never shared with third parties or used for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li>To provide, operate, and maintain the ServiSite platform</li>
              <li>To process payments and manage your subscription</li>
              <li>To send service-related communications (e.g. order notifications, account alerts)</li>
              <li>To improve and personalise your experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
            <p className="text-sm">
              Your data is stored on secure servers in the European Union. We use industry-standard encryption
              (TLS/HTTPS) for all data in transit. Media files are stored on Microsoft Azure Blob Storage.
              We implement appropriate technical and organisational measures to protect your personal data
              against unauthorised access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p className="mb-3 text-sm">We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li><strong>Stripe</strong> — payment processing</li>
              <li><strong>Microsoft Azure</strong> — media storage and hosting</li>
              <li><strong>Cloudflare</strong> — DNS management and CDN</li>
              <li><strong>Meta (Facebook)</strong> — social media posting (only when you connect your Page)</li>
              <li><strong>Anthropic</strong> — AI-generated post text (content only, no personal data sent)</li>
              <li><strong>Google</strong> — Google Places API for reviews</li>
            </ul>
            <p className="mt-3 text-sm">
              Each of these services has their own privacy policy governing their data practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p className="text-sm">
              We retain your data for as long as your account is active. If you cancel your account, we will
              delete your personal data within 30 days, except where we are required to retain it for legal
              or accounting purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights (GDPR)</h2>
            <p className="mb-3 text-sm">Under UK and EU GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-sm">
              <li><strong>Access</strong> — request a copy of your personal data</li>
              <li><strong>Rectification</strong> — correct inaccurate data</li>
              <li><strong>Erasure</strong> — request deletion of your data</li>
              <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
              <li><strong>Objection</strong> — object to certain types of processing</li>
            </ul>
            <p className="mt-3 text-sm">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@servisite.co.uk" className="text-blue-600 hover:underline">
                privacy@servisite.co.uk
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p className="text-sm">
              We use essential cookies to keep you logged in and maintain your session. We do not use
              advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by email or via a notice in your dashboard. Continued use of ServiSite after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p className="text-sm">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="mt-3 text-sm bg-gray-50 rounded-xl p-4 space-y-1">
              <p><strong>ServiSite</strong></p>
              <p>Email: <a href="mailto:privacy@servisite.co.uk" className="text-blue-600 hover:underline">privacy@servisite.co.uk</a></p>
              <p>Website: <a href="https://servisite.co.uk" className="text-blue-600 hover:underline">servisite.co.uk</a></p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <a href="/" className="text-sm text-blue-600 hover:underline">← Back to ServiSite</a>
        </div>
      </div>
    </div>
  );
}
