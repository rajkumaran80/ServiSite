import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// TTLs in seconds
export const TTL = {
  TENANT_PROFILE: 1800,   // 30 min — rarely changes
  CONTACT: 3600,          // 1 hr  — rarely changes
  MENU_STRUCTURE: 1800,   // 30 min — groups/categories change weekly
  MENU_FULL: 300,         // 5 min  — items may change daily
  GALLERY: 900,           // 15 min
  ENTRIES: 120,           // 2 min  — events/dj-nights change frequently
  PAGES: 900,             // 15 min
  DOMAIN_MAPPING: 1800,   // 30 min — custom domain → slug
  DOMAIN_NOT_FOUND: 30,   // 30 sec — negative cache for unknown domains
};

@Injectable()
export class TenantCacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — caching disabled, all reads pass through to DB');
      return;
    }
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 3000,
    });
    this.client.on('error', (err) =>
      this.logger.warn(`Redis connection error: ${err.message}`),
    );
    this.logger.log('Redis cache connected');
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  get isConnected(): boolean {
    return this.client !== null;
  }

  // ── Tenant-scoped keys ────────────────────────────────────────────────────

  private key(slug: string, resource: string): string {
    return `t:${slug}:${resource}`;
  }

  async get<T>(slug: string, resource: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(this.key(slug, resource));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(slug: string, resource: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(this.key(slug, resource), ttlSeconds, JSON.stringify(value));
    } catch { /* cache failure never blocks the request */ }
  }

  async invalidate(slug: string, ...resources: string[]): Promise<void> {
    if (!this.client || resources.length === 0) return;
    try {
      await this.client.del(...resources.map((r) => this.key(slug, r)));
    } catch { /* best-effort */ }
  }

  // ── Domain mapping (custom domain → slug) ─────────────────────────────────

  async getDomainSlug(hostname: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(`domain:${hostname}`);
    } catch {
      return null;
    }
  }

  async setDomainSlug(hostname: string, slug: string, ttlSeconds = TTL.DOMAIN_MAPPING): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(`domain:${hostname}`, ttlSeconds, slug);
    } catch { /* best-effort */ }
  }

  /** Cache a "not found" result so we don't hammer the DB for unknown domains */
  async setDomainNotFound(hostname: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(`domain:${hostname}`, TTL.DOMAIN_NOT_FOUND, '__NOT_FOUND__');
    } catch { /* best-effort */ }
  }

  async deleteDomainSlug(hostname: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(`domain:${hostname}`);
    } catch { /* best-effort */ }
  }
}
