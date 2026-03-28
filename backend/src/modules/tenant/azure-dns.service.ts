import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DnsManagementClient } from '@azure/arm-dns';
import { DefaultAzureCredential } from '@azure/identity';

@Injectable()
export class AzureDnsService {
  private readonly logger = new Logger(AzureDnsService.name);
  private client: DnsManagementClient | null = null;
  private resourceGroup: string;

  constructor(private readonly config: ConfigService) {
    const subscriptionId = config.get<string>('AZURE_SUBSCRIPTION_ID');
    this.resourceGroup = config.get<string>('AZURE_DNS_RESOURCE_GROUP') ?? '';

    if (subscriptionId && this.resourceGroup) {
      this.client = new DnsManagementClient(new DefaultAzureCredential(), subscriptionId);
      this.logger.log('Azure DNS client initialised');
    } else {
      this.logger.warn(
        'AZURE_SUBSCRIPTION_ID or AZURE_DNS_RESOURCE_GROUP not set — Azure DNS zone management disabled',
      );
    }
  }

  /**
   * Create (or update) a public DNS zone for the given domain.
   * Returns the nameserver records to be added at the registrar.
   */
  async createZone(domain: string): Promise<string[]> {
    if (!this.client) return [];

    try {
      const zone = await this.client.zones.createOrUpdate(
        this.resourceGroup,
        domain,
        { location: 'global', zoneType: 'Public' },
      );
      return zone.nameServers ?? [];
    } catch (err) {
      this.logger.error(`Failed to create Azure DNS zone for ${domain}: ${err}`);
      return [];
    }
  }

  /**
   * Delete the DNS zone for a domain when it's removed from a tenant.
   */
  async deleteZone(domain: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.zones.beginDeleteAndWait(this.resourceGroup, domain);
      this.logger.log(`Deleted Azure DNS zone: ${domain}`);
    } catch (err) {
      this.logger.warn(`Failed to delete Azure DNS zone for ${domain}: ${err}`);
    }
  }
}
