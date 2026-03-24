import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type CacheTag =
  | 'tenant'
  | 'contact'
  | 'menu'
  | 'gallery'
  | 'entries'
  | 'pages';

@Injectable()
export class NotifyNextjsService {
  private readonly logger = new Logger(NotifyNextjsService.name);
  private readonly frontendUrl: string;
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.secret = this.configService.get<string>('REVALIDATE_SECRET', '');
  }

  /**
   * Tell Next.js to bust ISR cache for the given tenant + tags.
   * Fire-and-forget — never throws, never blocks the response.
   */
  revalidate(slug: string, tags: CacheTag[]): void {
    if (!this.secret) {
      this.logger.warn('REVALIDATE_SECRET not set — skipping Next.js cache bust');
      return;
    }

    const url = `${this.frontendUrl}/api/revalidate`;
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': this.secret,
      },
      body: JSON.stringify({ slug, tags }),
    }).catch((err) =>
      this.logger.warn(`Next.js revalidation failed for ${slug}: ${err.message}`),
    );
  }
}
