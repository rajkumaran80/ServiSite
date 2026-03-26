import type { Tenant } from '../../types/tenant.types';

const TYPE_MAP: Record<string, string> = {
  RESTAURANT: 'Restaurant',
  CAFE: 'CafeOrCoffeeShop',
  BARBER_SHOP: 'HairSalon',
  SALON: 'BeautySalon',
  GYM: 'HealthClub',
  REPAIR_SHOP: 'AutoRepair',
  OTHER: 'LocalBusiness',
};

interface Props {
  tenant: Tenant;
  canonicalUrl: string;
}

export default function JsonLd({ tenant, canonicalUrl }: Props) {
  const contact = tenant.contactInfo;
  const schemaType = TYPE_MAP[tenant.type] ?? 'LocalBusiness';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: tenant.name,
    url: canonicalUrl,
    ...(tenant.logo && { image: tenant.logo }),
    ...(tenant.banner && { photo: tenant.banner }),
    ...(tenant.whatsappNumber && { telephone: tenant.whatsappNumber }),
    ...(contact?.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: contact.address,
        addressLocality: contact.city ?? undefined,
        addressRegion: contact.state ?? undefined,
        postalCode: contact.zipCode ?? undefined,
        addressCountry: contact.country ?? undefined,
      },
    }),
    ...(contact?.email && { email: contact.email }),
    ...(contact?.openingHours && {
      openingHoursSpecification: Object.entries(contact.openingHours)
        .filter(([, hours]) => !(hours as any).closed)
        .map(([day, hours]) => ({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()}`,
          opens: (hours as any).open ?? '',
          closes: (hours as any).close ?? '',
        })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
