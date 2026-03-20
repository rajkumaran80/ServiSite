import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, Roboto } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | ServiSite',
    default: 'ServiSite - Digital presence for your business',
  },
  description:
    'ServiSite helps restaurants, salons, and local service businesses build a beautiful digital presence with custom subdomains, menu management, and more.',
  keywords: ['restaurant website', 'salon website', 'local business', 'multi-tenant', 'SaaS'],
  authors: [{ name: 'ServiSite' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    siteName: 'ServiSite',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${roboto.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
