import type { Metadata, Viewport } from 'next';
import {
  Inter, Playfair_Display, Roboto, Montserrat, Quicksand,
  // Font Groups
  Josefin_Sans, DM_Sans,          // Geometric
  Lato,                            // Classic Serif body
  Libre_Baskerville,               // Editorial heading
  Source_Serif_4,                  // Editorial body
  Oswald,                          // Industrial heading
  Nunito,                          // Soft & Friendly
  Cormorant_Garamond,              // Luxury heading
  Jost,                            // Luxury body
  Shantell_Sans,                   // Handwritten heading
  Short_Stack,                     // Handwritten body
  Comic_Neue,                      // Comic group
} from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const roboto = Roboto({ subsets: ['latin'], weight: ['300', '400', '500', '700'], variable: '--font-roboto', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand', display: 'swap' });

// Font Group fonts
const josefinSans = Josefin_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-josefin-sans', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['300', '400', '700'], variable: '--font-lato', display: 'swap' });
const libreBaskerville = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-libre-baskerville', display: 'swap' });
const sourceSerif4 = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif-4', display: 'swap' });
const oswald = Oswald({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-oswald', display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });
const cormorantGaramond = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-cormorant-garamond', display: 'swap' });
const jost = Jost({ subsets: ['latin'], variable: '--font-jost', display: 'swap' });
const shantellSans = Shantell_Sans({ subsets: ['latin'], variable: '--font-shantell-sans', display: 'swap' });
const shortStack = Short_Stack({ subsets: ['latin'], weight: ['400'], variable: '--font-short-stack', display: 'swap' });
const comicNeue = Comic_Neue({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-comic-neue', display: 'swap' });

// Local fonts
const caviarDreams = localFont({
  src: [
    { path: '../public/fonts/CaviarDreams.woff2',           weight: '400', style: 'normal' },
    { path: '../public/fonts/CaviarDreams-Italic.woff2',    weight: '400', style: 'italic' },
    { path: '../public/fonts/CaviarDreams-Bold.woff2',      weight: '700', style: 'normal' },
    { path: '../public/fonts/CaviarDreams-BoldItalic.woff2',weight: '700', style: 'italic' },
  ],
  variable: '--font-caviar',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://servisite.co.uk'),
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
      className={[
        inter.variable, playfair.variable, roboto.variable, montserrat.variable, quicksand.variable,
        josefinSans.variable, dmSans.variable, lato.variable, libreBaskerville.variable,
        sourceSerif4.variable, oswald.variable, nunito.variable, cormorantGaramond.variable, jost.variable,
        shantellSans.variable, shortStack.variable, comicNeue.variable,
        caviarDreams.variable,
      ].join(' ')}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
