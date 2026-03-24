import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

// POST /api/revalidate
// Body: { slug: string, tags: string[] }
// Header: x-revalidate-secret
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { slug?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, tags } = body;
  if (!slug || !Array.isArray(tags) || tags.length === 0) {
    return NextResponse.json({ error: 'slug and tags required' }, { status: 400 });
  }

  const revalidated: string[] = [];
  for (const tag of tags) {
    // Tags are namespaced: tenant:{slug}:{resource} or tenant:{slug}
    const fullTag = tag === 'tenant' ? `tenant:${slug}` : `tenant:${slug}:${tag}`;
    revalidateTag(fullTag);
    revalidated.push(fullTag);
  }

  return NextResponse.json({ revalidated, now: Date.now() });
}
