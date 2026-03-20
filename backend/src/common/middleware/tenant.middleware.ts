import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

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
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    const appDomain = this.configService.get<string>('APP_DOMAIN', 'servisite.com');

    let slug: string | null = null;

    // Check X-Tenant-ID header first (for API clients / dashboard)
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      slug = tenantHeader;
    } else {
      // Extract subdomain from host
      // e.g. pizza-palace.servisite.com -> pizza-palace
      // Works for both production and localhost:3001 (pizza-palace.localhost:3001)
      const hostWithoutPort = host.split(':')[0];
      const domainWithoutPort = appDomain.split(':')[0];

      if (hostWithoutPort.endsWith(`.${domainWithoutPort}`)) {
        slug = hostWithoutPort.replace(`.${domainWithoutPort}`, '');
      } else if (hostWithoutPort.includes('.localhost')) {
        slug = hostWithoutPort.replace('.localhost', '');
      }
    }

    if (!slug) {
      // No tenant context - allow the request to proceed for non-tenant routes
      return next();
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, type: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant '${slug}' not found`);
    }

    req.tenant = tenant;
    next();
  }
}
