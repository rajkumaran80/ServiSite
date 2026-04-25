import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudflareService } from './cloudflare.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CloudflarePollingService {
  private readonly logger = new Logger(CloudflarePollingService.name);
  private readonly pollInterval: number;
  private isPolling = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly cloudflareService: CloudflareService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.pollInterval = this.configService.get<number>('CLOUDFLARE_POLL_INTERVAL', 30000); // 30 seconds
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('Cloudflare polling is already running');
      return;
    }

    this.logger.log('Starting Cloudflare polling service');
    this.isPolling = true;

    // Initial poll
    await this.pollAllDomains();

    // Set up recurring polling
    this.pollTimer = setInterval(() => {
      this.pollAllDomains().catch(error => {
        this.logger.error('Error during polling cycle:', error);
      });
    }, this.pollInterval);
  }

  async stopPolling(): Promise<void> {
    if (!this.isPolling) {
      return;
    }

    this.logger.log('Stopping Cloudflare polling service');
    this.isPolling = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollAllDomains(): Promise<void> {
    try {
      // Get all tenants with custom domains
      const tenants = await this.prisma.tenant.findMany({
        where: {
          customDomain: { not: null },
          customDomainStatus: { in: ['pending', 'active'] },
        },
        select: {
          id: true,
          slug: true,
          customDomain: true,
          customDomainStatus: true,
          customDomainToken: true,
          customDomainApexToken: true,
        },
      });

      for (const tenant of tenants) {
        await this.pollTenantDomain(tenant);
      }
    } catch (error) {
      this.logger.error('Error polling domains:', error);
    }
  }

  private async pollTenantDomain(tenant: any): Promise<void> {
    try {
      if (!tenant.customDomain) return;

      const hostname = tenant.customDomain;
      const customHostname = await this.cloudflareService.getCustomHostname(hostname);

      if (!customHostname) {
        this.logger.warn(`Custom hostname not found for ${hostname}`);
        return;
      }

      // Check if status has changed
      const statusChanged = customHostname.status !== tenant.customDomainStatus;
      
      if (statusChanged) {
        this.logger.log(`Domain status changed for ${hostname}: ${tenant.customDomainStatus} → ${customHostname.status}`);
        
        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            customDomainStatus: customHostname.status,
          },
        });

        // If domain became active, update verified timestamp
        if (customHostname.status === 'active' && tenant.customDomainStatus !== 'active') {
          await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { customDomainVerifiedAt: new Date() },
          });
        }
      }

    } catch (error) {
      this.logger.error(`Error polling domain for tenant ${tenant.slug}:`, error);
    }
  }

  async pollSpecificDomain(hostname: string): Promise<void> {
    try {
      const tenant = await this.prisma.tenant.findFirst({
        where: { customDomain: hostname },
        select: {
          id: true,
          slug: true,
          customDomain: true,
          customDomainStatus: true,
        },
      });

      if (tenant) {
        await this.pollTenantDomain(tenant);
      }
    } catch (error) {
      this.logger.error(`Error polling specific domain ${hostname}:`, error);
    }
  }

  async getDomainStatus(hostname: string): Promise<any> {
    try {
      const customHostname = await this.cloudflareService.getCustomHostname(hostname);
      return customHostname;
    } catch (error) {
      this.logger.error(`Error getting domain status for ${hostname}:`, error);
      return null;
    }
  }
}
