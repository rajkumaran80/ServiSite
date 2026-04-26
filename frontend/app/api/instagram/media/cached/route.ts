import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';

// Proxy to the backend Instagram cached-media endpoint.
// Identifies the tenant by slug query-param (passed by SectionRenderer).
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') || '';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': slug,
    };
    if (INTERNAL_SECRET) headers['x-internal-secret'] = INTERNAL_SECRET;

    const res = await fetch(`${API_URL}/instagram/media/public?slug=${encodeURIComponent(slug)}`, {
      headers,
      next: { revalidate: 300 }, // 5 min cache
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // fall through to empty response
  }

  return NextResponse.json({ success: true, data: [] });
}
