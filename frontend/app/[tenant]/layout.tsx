import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '../../components/tenant/Navbar';
import Footer from '../../components/tenant/Footer';
import WhatsAppButton from '../../components/tenant/WhatsAppButton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}): Promise<Metadata> {
  const tenant = await getTenant(params.tenant);

  if (!tenant) {
    return { title: 'Not Found' };
  }

  return {
    title: {
      template: `%s | ${tenant.name}`,
      default: tenant.name,
    },
    description: `Welcome to ${tenant.name}. View our menu, gallery, and contact information.`,
    openGraph: {
      title: tenant.name,
      description: `Welcome to ${tenant.name}`,
      images: tenant.banner ? [{ url: tenant.banner }] : [],
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenant: string };
}) {
  const tenant = await getTenant(params.tenant);

  if (!tenant) {
    notFound();
  }

  const theme = tenant.themeSettings || {
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    fontFamily: 'Inter',
  };

  // Convert hex color to RGB for CSS custom properties
  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '59 130 246';
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
  }

  const primaryRgb = hexToRgb(theme.primaryColor);
  const secondaryRgb = hexToRgb(theme.secondaryColor);

  return (
    <>
      <style>{`
        :root {
          --color-primary: ${primaryRgb};
          --color-secondary: ${secondaryRgb};
          --font-family: '${theme.fontFamily}', system-ui, sans-serif;
        }
      `}</style>
      <div
        style={{
          fontFamily: `'${theme.fontFamily}', system-ui, sans-serif`,
        }}
        className="min-h-screen flex flex-col bg-white"
      >
        <Navbar tenant={tenant} />
        <main className="flex-1">{children}</main>
        <Footer tenant={tenant} />
        {tenant.whatsappNumber && (
          <WhatsAppButton
            phoneNumber={tenant.whatsappNumber}
            businessName={tenant.name}
          />
        )}
      </div>
    </>
  );
}
