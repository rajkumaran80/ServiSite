'use server';

import { revalidateTag } from 'next/cache';

/**
 * Bust the Next.js Data Cache for a tenant after an admin save.
 * Called as a Server Action from the settings page client component.
 */
export async function revalidateTenantCache(slug: string): Promise<void> {
  if (!slug) return;
  revalidateTag(`tenant:${slug}`, {});
  revalidateTag(`tenant:${slug}:menu`, {});
  revalidateTag(`tenant:${slug}:gallery`, {});
  revalidateTag(`tenant:${slug}:entries`, {});
  revalidateTag(`tenant:${slug}:pages`, {});
}
