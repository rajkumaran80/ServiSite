import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const h = await headers();
  return NextResponse.json({
    status: 'ok',
    host: h.get('host'),
    xForwardedHost: h.get('x-forwarded-host'),
    xOriginalHost: h.get('x-original-host'),
  });
}
