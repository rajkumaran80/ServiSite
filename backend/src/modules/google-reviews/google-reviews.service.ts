import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantCacheService } from '../../common/cache/tenant-cache.service';

export interface GoogleReview {
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  googleMapsUri: string | null;
}

const CACHE_TTL = 60 * 60 * 24; // 24 hours

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tenantCache: TenantCacheService,
  ) {
    this.apiKey = config.get<string>('GOOGLE_PLACES_API_KEY', '');
  }

  async findPlaceId(query: string): Promise<{ placeId: string; name: string; address: string } | null> {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not configured — cannot find place ID');
      return null;
    }

    try {
      // Places API (New) — Text Search v1
      const url = `https://places.googleapis.com/v1/places:searchText?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      });
      if (!res.ok) return null;

      const data = await res.json();
      if (!data.places?.length) return null;

      const p = data.places[0];
      return {
        placeId: p.id,
        name: p.displayName?.text ?? p.id,
        address: p.formattedAddress ?? '',
      };
    } catch (err) {
      this.logger.error(`findPlaceId failed: ${err.message}`);
      return null;
    }
  }

  async getReviews(tenantId: string, slug: string): Promise<GoogleReview[]> {
    // Check cache before hitting DB
    const cacheKey = 'google-reviews';
    const cached = await this.tenantCache.get<GoogleReview[]>(slug, cacheKey);
    if (cached) return cached;

    // Get place ID from tenant themeSettings
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { themeSettings: true },
    });
    const placeId: string = (tenant?.themeSettings as any)?.googlePlaceId || '';

    if (!placeId) return [];

    if (!this.apiKey) {
      this.logger.warn('GOOGLE_PLACES_API_KEY not configured — cannot fetch reviews');
      return [];
    }

    try {
      // Places API (New) — v1 endpoint
      const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=reviews&key=${this.apiKey}`;

      const res = await fetch(url, {
        headers: { 'X-Goog-FieldMask': 'reviews.rating,reviews.text,reviews.authorAttribution,reviews.relativePublishTimeDescription,reviews.googleMapsUri' },
      });
      if (!res.ok) {
        this.logger.warn(`Places API HTTP ${res.status} for place ${placeId}`);
        return [];
      }

      const data = await res.json();

      if (data.error) {
        this.logger.warn(`Places API error for place ${placeId}: ${data.error?.message}`);
        return [];
      }

      const reviews: GoogleReview[] = (data.reviews ?? [])
        .filter((r: any) => r.text?.text?.trim() && r.rating >= 3)
        .sort((a: any, b: any) => b.rating - a.rating)
        .slice(0, 6)
        .map((r: any) => ({
          authorName: r.authorAttribution?.displayName ?? 'Anonymous',
          authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
          rating: r.rating,
          text: (r.text?.text ?? '').slice(0, 300).trimEnd() + ((r.text?.text?.length ?? 0) > 300 ? '…' : ''),
          relativeTime: r.relativePublishTimeDescription ?? '',
          googleMapsUri: r.googleMapsUri ?? null,
        }));

      await this.tenantCache.set(slug, cacheKey, reviews, CACHE_TTL);
      return reviews;
    } catch (err) {
      this.logger.error(`Failed to fetch Google reviews for ${placeId}: ${err.message}`);
      return [];
    }
  }
}
