import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudflareService } from './cloudflare.service';
import { TenantService } from './tenant.service';

@Injectable()
export class DomainPollerService {
  private readonly logger = new Logger(DomainPollerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflare: CloudflareService,
    private readonly tenantService: TenantService,
  ) {}

  @Cron('*/60 * * * * *', { name: 'domain-activation-poll' })
  async pollPendingDomains(): Promise<void> {
    const pendingTenants = await this.prisma.tenant.findMany({
      where: {
        customDomainStatus: 'pending',
        customDomainToken: { not: null },
        customDomainApexToken: { not: null },
      },
      select: {
        id: true,
        slug: true,
        customDomain: true,
        customDomainToken: true,
        customDomainApexToken: true,
      },
    });

    if (!pendingTenants.length) return;

    this.logger.debug(`Polling ${pendingTenants.length} pending domain(s)`);

    for (const tenant of pendingTenants) {
      try {
        const bothActive = await this.cloudflare.areBothCustomHostnamesActive(
          tenant.customDomainApexToken!,
          tenant.customDomainToken!,
        );

        if (bothActive) {
          await this.tenantService.activateCustomDomain(
            tenant.id,
            tenant.customDomain!,
            tenant.slug,
          );
          this.logger.log(`Auto-activated domain: ${tenant.customDomain}`);
        }
      } catch (err) {
        this.logger.warn(`Poll failed for ${tenant.customDomain}: ${err.message}`);
      }
    }
  }
}
