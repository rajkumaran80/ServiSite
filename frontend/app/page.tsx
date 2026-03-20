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
                href="/auth/login"
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
              href="/auth/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-200"
            >
              Start for free →
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto text-gray-700 hover:text-gray-900 font-medium px-8 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-lg"
            >
              See how it works
            </a>
          </div>

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
            href="/auth/login"
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
