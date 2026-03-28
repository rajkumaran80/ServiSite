import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Navbar from '../../components/tenant/Navbar';
import Footer from '../../components/tenant/Footer';
import WhatsAppButton from '../../components/tenant/WhatsAppButton';
import JsonLd from '../../components/tenant/JsonLd';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'servisite.co.uk';

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, {
      // Tag-based caching: data is cached and immediately busted by revalidateTenantCache()
      // after every admin save. Fallback TTL of 60s in case revalidation is missed.
      next: { tags: [`tenant:${slug}`], revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

function buildDescription(tenant: Awaited<ReturnType<typeof getTenant>>): string {
  if (!tenant) return '';
  const contact = tenant.contactInfo;
  const city = contact?.city ? ` in ${contact.city}` : '';
  const typeLabel: Record<string, string> = {
    RESTAURANT: 'restaurant', CAFE: 'café', BARBER_SHOP: 'barber shop',
    SALON: 'salon', GYM: 'gym', REPAIR_SHOP: 'repair shop', OTHER: 'business',
  };
  const type = typeLabel[tenant.type] ?? 'business';
  return `${tenant.name} is a ${type}${city}. View our menu, gallery, opening hours and contact details.`;
}

export async function generateMetadata({
  params,
}: {
  params: { tenant: string };
}): Promise<Metadata> {
  const tenant = await getTenant(params.tenant);
  if (!tenant) return { title: 'Not Found' };

  const canonicalUrl = tenant.customDomain
    ? `https://${tenant.customDomain}`
    : `https://${tenant.slug}.${APP_DOMAIN}`;
  const description = buildDescription(tenant);

  return {
    title: { template: `%s | ${tenant.name}`, default: tenant.name },
    description,
    keywords: [tenant.name, tenant.type.toLowerCase().replace('_', ' '), tenant.contactInfo?.city ?? ''].filter(Boolean),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
      siteName: tenant.name,
      title: tenant.name,
      description,
      url: canonicalUrl,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: tenant.name,
      description,
      images: tenant.banner ? [tenant.banner] : [],
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

  if (!tenant) notFound();

  const theme = tenant.themeSettings || {};
  const primaryColor = (theme as any).primaryColor || '#3B82F6';
  const secondaryColor = (theme as any).secondaryColor || '#1E40AF';
  const fontFamily = (theme as any).fontFamily ?? 'Inter';

  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '59 130 246';
    return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
  }

  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);

  const canonicalUrl = (tenant as any).customDomain
    ? `https://${(tenant as any).customDomain}`
    : `https://${tenant.slug}.${APP_DOMAIN}`;

  return (
    <>
      <JsonLd tenant={tenant} canonicalUrl={canonicalUrl} />
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-primary: ${primaryRgb};
          --color-secondary: ${secondaryRgb};
          --font-family: '${fontFamily}', system-ui, sans-serif;
        }
      ` }} />
      <div
        style={{ fontFamily: `'${fontFamily}', system-ui, sans-serif` }}
        className="min-h-screen flex flex-col bg-white"
      >
        <Navbar tenant={tenant} />
        <main className="flex-1">{children}</main>
        <Footer tenant={tenant} />
        {tenant.whatsappNumber && (
          <WhatsAppButton phoneNumber={tenant.whatsappNumber} businessName={tenant.name} />
        )}
      </div>
    </>
  );
}
