import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TenantCacheService } from '../cache/tenant-cache.service';

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    slug: string;
    name: string;
    type: string;
  };
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tenantCache: TenantCacheService,
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    // Skip for routes that don't need tenant context. The NestJS exclude() in
    // app.module.ts may not match reliably behind Azure App Service proxies, so
    // we also guard here using the original URL from multiple sources.
    const rawUrl =
      (req.headers['x-original-url'] as string) ||
      req.originalUrl ||
      req.url ||
      '';
    if (
      rawUrl.includes('/api/v1/health') ||
      rawUrl.includes('/api/v1/auth/') ||
      rawUrl.includes('/api/v1/tenant') ||
      rawUrl.startsWith('/docs')
    ) {
      return next();
    }

    const host = req.headers.host || '';
    // When behind Azure Front Door / proxies, the original host is preserved here
    const forwardedHost = (req.headers['x-forwarded-host'] as string) || host;
    const appDomain = this.configService.get<string>('APP_DOMAIN', 'servisite.com');

    let slug: string | null = null;
    let resolvedByCustomDomain = false;

    // 1. X-Tenant-ID header — used by dashboard API calls
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      slug = tenantHeader;
    } else {
      const hostWithoutPort = forwardedHost.split(':')[0];
      const domainWithoutPort = appDomain.split(':')[0];

      // 2. Subdomain of our app domain  e.g. pizza-palace.servisite.com
      if (hostWithoutPort.endsWith(`.${domainWithoutPort}`)) {
        slug = hostWithoutPort.replace(`.${domainWithoutPort}`, '');
      }
      // 3. Local dev  e.g. pizza-palace.localhost
      else if (hostWithoutPort.includes('.localhost')) {
        slug = hostWithoutPort.replace('.localhost', '');
      }
      // 4. Custom domain  e.g. pizzapalace.com
      else if (
        hostWithoutPort !== domainWithoutPort &&
        hostWithoutPort !== 'localhost' &&
        !hostWithoutPort.endsWith('.localhost')
      ) {
        slug = await this.resolveCustomDomain(hostWithoutPort);
        if (slug) resolvedByCustomDomain = true;
      }
    }

    if (!slug) {
      return next();
    }

    // Fetch tenant identity from Redis or DB
    const cached = await this.tenantCache.get<TenantRequest['tenant']>(slug, 'identity');
    if (cached) {
      req.tenant = cached;
      return next();
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, type: true },
    });

    if (!tenant) {
      if (resolvedByCustomDomain) {
        // Stale cache entry — clear it and continue without tenant
        return next();
      }
      throw new NotFoundException(`Tenant '${slug}' not found`);
    }

    // Cache identity for 30 min (same as TENANT_PROFILE)
    await this.tenantCache.set(slug, 'identity', tenant, 1800);
    req.tenant = tenant;
    next();
  }

  /** Resolve a custom hostname → tenant slug via Redis cache then DB */
  private async resolveCustomDomain(hostname: string): Promise<string | null> {
    // Check Redis first
    const cached = await this.tenantCache.getDomainSlug(hostname);
    if (cached === '__NOT_FOUND__') return null; // negative cache hit
    if (cached) return cached;

    // DB lookup
    const tenant = await this.prisma.tenant.findFirst({
      where: { customDomain: hostname, customDomainStatus: 'active' },
      select: { slug: true },
    });

    if (tenant) {
      await this.tenantCache.setDomainSlug(hostname, tenant.slug);
      return tenant.slug;
    }

    // Cache the miss so we don't hammer DB for unknown domains
    await this.tenantCache.setDomainNotFound(hostname);
    return null;
  }
}
