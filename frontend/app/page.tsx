import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ServiSite - Beautiful websites for local businesses',
  description:
    'Create a stunning digital presence for your restaurant, salon, or local business in minutes. Custom subdomain, menu management, gallery, and more.',
};

export default function LandingPage() {
  const features = [
    {
      icon: '🌐',
      title: 'Custom Subdomain',
      description:
        'Get your own branded URL like pizzapalace.servisite.com instantly.',
    },
    {
      icon: '🍽️',
      title: 'Menu & Services',
      description:
        'Showcase your menu or services with beautiful categories and images.',
    },
    {
      icon: '📸',
      title: 'Photo Gallery',
      description:
        'Display your best photos to attract customers and build trust.',
    },
    {
      icon: '📱',
      title: 'WhatsApp Integration',
      description:
        'Let customers contact you directly via WhatsApp with one tap.',
    },
    {
      icon: '🎨',
      title: 'Custom Branding',
      description:
        'Match your brand colors and fonts for a professional look.',
    },
    {
      icon: '📊',
      title: 'Easy Dashboard',
      description:
        'Manage everything from a simple, intuitive admin dashboard.',
    },
  ];

  const businessTypes = [
    { icon: '🍕', label: 'Restaurants' },
    { icon: '✂️', label: 'Salons & Barbershops' },
    { icon: '🔧', label: 'Repair Shops' },
    { icon: '🏪', label: 'Local Businesses' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">ServiSite</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm">
                Features
              </a>
              <a href="#businesses" className="text-gray-600 hover:text-gray-900 text-sm">
                For Businesses
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm">
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Now supporting restaurants, salons & more
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your business deserves
            <span className="text-blue-600 block">a beautiful website</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Create a stunning digital presence for your local business in minutes.
            Custom subdomain, menu/services showcase, photo gallery, and WhatsApp button — all included.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-200"
            >
              Start free trial →
            </Link>
            <a
              href="#pricing"
              className="w-full sm:w-auto text-gray-700 hover:text-gray-900 font-medium px-8 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-lg"
            >
              See pricing
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-4">7-day free trial &nbsp;·&nbsp; No credit card required</p>

          {/* Demo preview */}
          <div className="mt-16 relative">
            <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl max-w-4xl mx-auto">
              <div className="bg-gray-800 rounded-xl h-8 flex items-center px-4 gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="flex-1 bg-gray-700 rounded h-4 mx-4 flex items-center px-3">
                  <span className="text-gray-400 text-xs">pizza-palace.servisite.com</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg h-64 flex items-center justify-center">
                <div className="text-center text-white">
                  <h2 className="text-3xl font-bold">Pizza Palace</h2>
                  <p className="text-orange-100 mt-2">Authentic Italian Cuisine</p>
                  <div className="flex gap-3 mt-6 justify-center">
                    <span className="bg-white/20 px-4 py-2 rounded-lg text-sm">View Menu</span>
                    <span className="bg-white/20 px-4 py-2 rounded-lg text-sm">Contact Us</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Types */}
      <section id="businesses" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-8">
            Perfect for all local businesses
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {businessTypes.map((type) => (
              <div
                key={type.label}
                className="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-full"
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="font-medium text-gray-800">{type.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              All the tools to create a professional online presence without any technical knowledge.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free for 7 days — no credit card required. Pay only when you're ready to go live.
            </p>
          </div>

          {/* Trial callout */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 px-6 py-3 rounded-full text-sm font-medium">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              7-day free trial &nbsp;·&nbsp; No credit card needed &nbsp;·&nbsp; Cancel any time
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Basic Plan */}
            <div className="border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-300 transition-colors">
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Basic</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">£49</span>
                  <span className="text-gray-500 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">+ £299 one-time setup fee</p>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Everything you need for a professional business website.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Custom subdomain (yourname.servisite.com)',
                  'Menu / services showcase',
                  'Photo gallery',
                  'Contact & WhatsApp integration',
                  'Custom branding & colours',
                  'Admin dashboard',
                  'Mobile-friendly design',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup?plan=basic"
                className="block w-full text-center py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-xl transition-colors"
              >
                Start free trial
              </Link>
            </div>

            {/* Ordering Plan */}
            <div className="border-2 border-blue-600 rounded-2xl p-8 relative shadow-lg shadow-blue-100">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Ordering</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gray-900">£99</span>
                  <span className="text-gray-500 mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">+ £299 one-time setup fee</p>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Everything in Basic, plus a full online ordering system to take orders and grow revenue.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Basic',
                  'Online ordering with cart',
                  'Bundle & combo meals',
                  'Item modifiers (sizes, extras)',
                  'Pricing rules & discounts',
                  'Real-time order notifications',
                  'Email & WhatsApp order alerts',
                  '5% platform fee on orders (rest goes to you)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup?plan=ordering"
                className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>

          {/* Setup fee note */}
          <div className="mt-10 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
            <p className="font-semibold mb-1">About the £299 one-time setup fee</p>
            <p className="text-amber-800 leading-relaxed">
              This is paid once to activate your site after the trial. It covers your custom domain setup,
              onboarding, and first-month service. Monthly billing starts from month 2. You can pay any
              time during or after the trial from your dashboard — <strong>no card needed to sign up</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to grow your business?
          </h2>
          <p className="text-blue-100 text-xl mb-10">
            Join hundreds of local businesses already using ServiSite.
            Set up your page in under 5 minutes.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block bg-white text-blue-600 font-semibold px-10 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            Create your free page →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-white font-bold text-xl">ServiSite</span>
              <p className="text-sm mt-1">Digital presence for local businesses</p>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            © {new Date().getFullYear()} ServiSite. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
