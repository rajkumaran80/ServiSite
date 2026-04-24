import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Convert plain text with line breaks to HTML - match exact user input
function formatTextToHtml(text: string): string {
  if (!text) return '';
  
  // First convert double line breaks to double br tags for paragraph gaps
  let formatted = text.replace(/\n\s*\n/g, '<br><br>');
  
  // Then convert single line breaks to br tags
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

async function getTenant(slug: string) {
  try {
    const res = await fetch(`${API_URL}/tenant/${slug}`, { next: { tags: [`tenant:${slug}`], revalidate: 60 } });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

async function getPage(slug: string, pageSlug: string) {
  try {
    const res = await fetch(`${API_URL}/pages/${pageSlug}`, {
      headers: { 'x-tenant-id': slug },
      next: { tags: [`tenant:${slug}:pages`], revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()).data;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }): Promise<Metadata> {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  if (!tenant) return { title: 'About' };
  return {
    title: 'About',
    description: `Learn more about ${tenant.name} — our story, team and values.`,
    openGraph: {
      title: `About | ${tenant.name}`,
      description: `Learn more about ${tenant.name}.`,
      images: tenant.banner ? [{ url: tenant.banner, alt: tenant.name }] : [],
    },
    twitter: { card: 'summary_large_image', title: `About | ${tenant.name}` },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenant(tenantSlug);
  if (!tenant) notFound();

  // Try to get the page from the new pages system first
  const page = await getPage(tenantSlug, 'about');
  const primaryColor = (tenant.themeSettings as any)?.primaryColor || '#3B82F6';

  if (page) {
    // Use new pages system (even if sections are empty)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <h1 className="text-3xl md:text-4xl text-gray-900">{page.title}</h1>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {page.sections && page.sections.length > 0 ? (
            page.sections.map((section: any, index: number) => (
              <div key={section.id || index} className="mb-8">
                {section.type === 'image_text' && (
                  <div className="relative" style={{ overflow: 'hidden' }}>
                    {section.content?.imageUrl && (
                      <div 
                        style={{
                          float: section.content?.imagePosition === 'right' ? 'right' : 'left',
                          marginRight: section.content?.imagePosition === 'left' ? '1rem' : '0',
                          marginLeft: section.content?.imagePosition === 'right' ? '1rem' : '0',
                          marginBottom: '1rem',
                          width: '300px',
                          maxWidth: '300px'
                        }}
                      >
                        <img
                          src={section.content.imageUrl}
                          alt={section.content?.imageAlt || ''}
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                      </div>
                    )}
                    <div style={{ width: '100%' }}>
                      {section.content?.heading && (
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.content.heading}</h2>
                      )}
                      <div 
                        className="text-gray-700"
                        dangerouslySetInnerHTML={{ __html: formatTextToHtml(section.content?.body || '') }}
                      />
                      {section.content?.buttonLabel && section.content?.buttonHref && (
                        <div className="mt-6">
                          <a
                            href={section.content.buttonHref}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                          >
                            {section.content.buttonLabel}
                          </a>
                        </div>
                      )}
                    </div>
                    <div style={{ clear: 'both' }}></div>
                  </div>
                )}
                
                {section.type === 'text' && (
                  <div>
                    {section.content?.heading && (
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.content.heading}</h2>
                    )}
                    <div 
                      className="text-gray-700"
                      style={{ textAlign: section.content?.align || 'left' }}
                      dangerouslySetInnerHTML={{ __html: formatTextToHtml(section.content?.body || '') }}
                    />
                  </div>
                )}
                
                {section.type !== 'text' && section.type !== 'image_text' && (
                  <div>
                    {section.content?.heading && (
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.content.heading}</h2>
                    )}
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700">{JSON.stringify(section.content)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No content available yet. Please add sections in the dashboard.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback to old page-entries system if no page found
  const { getPredefinedPage } = await import('../../../config/predefined-pages');
  const { EntryListPage } = await import('../../../components/tenant/EntryListPage');
  
  async function getEntries(tenantSlug: string, pageKey: string) {
    try {
      const res = await fetch(`${API_URL}/page-entries?pageKey=${pageKey}`, {
        headers: { 'x-tenant-id': tenantSlug },
        next: { tags: [`tenant:${tenantSlug}:entries`], revalidate: 60 },
      });
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    } catch { return []; }
  }

  const pageDef = getPredefinedPage('about')!;
  const entries = await getEntries(tenantSlug, 'about');

  return <EntryListPage pageDef={pageDef} entries={entries} primaryColor={primaryColor} />;
}
