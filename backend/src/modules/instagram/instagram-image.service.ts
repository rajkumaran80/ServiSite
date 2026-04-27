import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InstagramImageService {
  private readonly logger = new Logger(InstagramImageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cache Instagram images server-side to avoid CDN restrictions
   */
  async cacheInstagramImage(imageUrl: string): Promise<{ url: string; isCached: boolean; success: boolean }> {
    try {
      console.log('Attempting to cache Instagram image:', imageUrl);
      
      // Check if we already have this image cached
      const existingCache = await this.prisma.cachedImage.findUnique({
        where: { url: imageUrl },
      });

      if (existingCache && existingCache.expiresAt > new Date()) {
        console.log('Found existing cached image:', existingCache.id);
        return { url: `/api/instagram/image/${existingCache.id}`, isCached: true, success: true };
      }

      // Try multiple user agents to bypass Instagram restrictions
      const userAgents = [
        'Instagram 219.0.0.12.21 Android',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ];

      let response: Response | null = null;
      let lastError: Error | null = null;

      for (const userAgent of userAgents) {
        try {
          response = await fetch(imageUrl, {
            headers: {
              'User-Agent': userAgent,
              'Accept': 'image/webp,image/apng,image/jpeg,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.instagram.com/',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });

          if (response.ok) {
            break;
          }
        } catch (err) {
          lastError = err as Error;
          console.log(`Failed with user agent ${userAgent}:`, err);
          continue;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error(`Failed to fetch image: ${response?.status}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      console.log(`Successfully fetched image, size: ${buffer.byteLength}, type: ${contentType}`);

      // Store the image in database
      const cachedImage = await this.prisma.cachedImage.create({
        data: {
          url: imageUrl,
          data: Buffer.from(buffer),
          contentType,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      console.log('Successfully cached image:', cachedImage.id);
      return { url: `/api/instagram/image/${cachedImage.id}`, isCached: true, success: true };
    } catch (error) {
      this.logger.error('Failed to cache Instagram image:', error);
      console.error('Detailed error:', error);
      return { url: imageUrl, isCached: false, success: false };
    }
  }

  async getCachedImage(id: string): Promise<{ data: Buffer; contentType: string }> {
    const cachedImage = await this.prisma.cachedImage.findUnique({
      where: { id },
    });

    if (!cachedImage || cachedImage.expiresAt < new Date()) {
      throw new Error('Image not found or expired');
    }

    return {
      data: cachedImage.data,
      contentType: cachedImage.contentType,
    };
  }

  /**
   * Clean up expired images
   */
  async cleanupExpiredImages(): Promise<void> {
    await this.prisma.cachedImage.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
