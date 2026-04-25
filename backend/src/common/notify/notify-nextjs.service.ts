import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export type CacheTag =
  | 'tenant'
  | 'contact'
  | 'menu'
  | 'gallery'
  | 'entries'
  | 'pages'
  | 'nav'
  | 'home-sections';

// Tenant pages that Cloudflare may have cached
const TENANT_URL_PATTERNS = [
  '',          // home
  '/menu',
  '/gallery',
  '/contact',
  '/about',
  '/order',
];

@Injectable()
export class NotifyNextjsService {
  private readonly logger = new Logger(NotifyNextjsService.name);
  private readonly frontendUrl: string;
  private readonly secret: string;
  private readonly appDomain: string;
  private readonly cfApiToken: string;
  private readonly cfZoneId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    this.secret = this.configService.get<string>('REVALIDATE_SECRET', '');
    this.appDomain = this.configService.get<string>('APP_DOMAIN', '');
    this.cfApiToken = this.configService.get<string>('CLOUDFLARE_API_KEY', '');
    this.cfZoneId = this.configService.get<string>('CLOUDFLARE_ZONE_ID', '');
  }

  /**
   * Tell Next.js to bust ISR cache for the given tenant + tags,
   * and simultaneously purge Cloudflare edge cache for that tenant's pages.
   * Fire-and-forget — never throws, never blocks the response.
   * customDomain is optional — if not provided, looked up from DB automatically.
   */
  revalidate(slug: string, tags: CacheTag[], customDomain?: string): void {
    this.bustNextjs(slug, tags);
    // Look up custom domain from DB if not provided, then purge
    if (customDomain !== undefined) {
      this.purgeCloudflare(slug, customDomain || undefined);
    } else {
      this.prisma.tenant.findUnique({
        where: { slug },
        select: { customDomain: true, customDomainStatus: true },
      }).then((t) => {
        const domain = t?.customDomainStatus === 'active' ? (t.customDomain ?? undefined) : undefined;
        this.purgeCloudflare(slug, domain);
      }).catch(() => this.purgeCloudflare(slug, undefined));
    }
  }

  private bustNextjs(slug: string, tags: CacheTag[]): void {
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

  private purgeCloudflare(slug: string, customDomain?: string): void {
    if (!this.cfApiToken || !this.cfZoneId || !this.appDomain) return;

    // Build list of URLs to purge — subdomain + custom domain (if any)
    const urls: string[] = [];

    // *.servisite.co.uk subdomain
    for (const path of TENANT_URL_PATTERNS) {
      urls.push(`https://${slug}.${this.appDomain}${path}`);
    }

    // Custom domain (e.g. www.la-cafe.co.uk)
    if (customDomain) {
      for (const path of TENANT_URL_PATTERNS) {
        urls.push(`https://www.${customDomain}${path}`);
        urls.push(`https://${customDomain}${path}`);
      }
    }

    // Cloudflare purge API accepts max 30 URLs per call — batch if needed
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += 30) {
      batches.push(urls.slice(i, i + 30));
    }

    for (const batch of batches) {
      fetch(`https://api.cloudflare.com/client/v4/zones/${this.cfZoneId}/purge_cache`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: batch }),
      }).catch((err) =>
        this.logger.warn(`Cloudflare cache purge failed for ${slug}: ${err.message}`),
      );
    }

    this.logger.debug(`Cloudflare cache purge queued for ${slug} (${urls.length} URLs)`);
  }
}
