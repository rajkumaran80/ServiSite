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
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(placeId)}` +
        `&fields=reviews` +
        `&reviews_sort=newest` +
        `&key=${this.apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`Places API HTTP ${res.status} for place ${placeId}`);
        return [];
      }

      const data = await res.json();

      if (data.status !== 'OK') {
        this.logger.warn(`Places API status: ${data.status} for place ${placeId}`);
        return [];
      }

      const reviews: GoogleReview[] = (data.result?.reviews ?? [])
        .filter((r: any) => r.text?.trim())
        .map((r: any) => ({
          authorName: r.author_name,
          authorPhotoUrl: r.profile_photo_url || null,
          rating: r.rating,
          text: r.text,
          relativeTime: r.relative_time_description,
        }));

      await this.tenantCache.set(slug, cacheKey, reviews, CACHE_TTL);
      return reviews;
    } catch (err) {
      this.logger.error(`Failed to fetch Google reviews for ${placeId}: ${err.message}`);
      return [];
    }
  }
}
