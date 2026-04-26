import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';

export interface CreateDnsRecordDto {
  hostname: string;
  recordType: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
  provider?: string;
  providerRecordId?: string;
  isOwnershipVerification?: boolean;
  isSSLValidation?: boolean;
  isSystemManaged?: boolean;
  status?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface UpdateDnsRecordDto {
  recordType?: string;
  name?: string;
  value?: string;
  ttl?: number;
  priority?: number;
  status?: string;
  providerRecordId?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface DnsZoneDto {
  zoneName: string;
  provider?: string;
  providerZoneId?: string;
  status?: string;
  nameservers?: string[];
  originUrl?: string;
  customDomainStatus?: string;
  sslStatus?: string;
  ownershipStatus?: string;
}

@Injectable()
export class DnsService {
  private readonly logger = new Logger(DnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  // DNS Zone Management
  async createDnsZone(tenantId: string, data: DnsZoneDto): Promise<any> {
    try {
      const zone = await this.prisma.dnsZone.create({
        data: {
          tenantId,
          zoneName: data.zoneName,
          provider: data.provider || 'cloudflare',
          providerZoneId: data.providerZoneId,
          originUrl: data.originUrl,
          nameservers: data.nameservers || [],
          status: data.status || 'active',
          lastVerifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      this.logger.log(`Created DNS zone for tenant ${tenantId}: ${data.zoneName}`);
      return zone;
    } catch (error) {
      this.logger.error(`Failed to create DNS zone: ${error.message}`);
      throw error;
    }
  }

  async getDnsZone(tenantId: string): Promise<any> {
    try {
      // Get tenant's custom domain and zone info
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customDomain: true, customDomainZoneId: true, customDomainNsRecords: true },
      });

      const zone = await this.prisma.dnsZone.findUnique({
        where: { tenantId },
        include: { dnsRecords: { orderBy: { createdAt: 'asc' } } },
      });

      if (!tenant?.customDomain) return zone;

      // New approach: Use zone-based status polling
      let zoneStatus = 'pending';
      if (tenant.customDomainZoneId) {
        try {
          const cfZone = await this.cloudflareService.getZoneStatus(tenant.customDomainZoneId);
          zoneStatus = cfZone.status;
        } catch (error) {
          this.logger.warn(`Failed to get zone status: ${error.message}`);
        }
      }

      return {
        ...(zone ?? { tenantId }),
        customDomain: tenant.customDomain,
        customDomainStatus: zoneStatus,
        sslStatus: zoneStatus === 'active' ? 'active' : 'pending',
        nameservers: tenant.customDomainNsRecords || [],
        dnsRecords: zone?.dnsRecords || [],
      };
    } catch (error) {
      this.logger.error(`Failed to get DNS zone: ${error.message}`);
      throw error;
    }
  }

  async updateDnsZone(tenantId: string, data: Partial<DnsZoneDto>): Promise<any> {
    try {
      const updatedZone = await this.prisma.dnsZone.update({
        where: { tenantId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      this.logger.log(`Updated DNS zone for tenant ${tenantId}`);
      return updatedZone;
    } catch (error) {
      this.logger.error(`Failed to update DNS zone: ${error.message}`);
      throw error;
    }
  }

  // DNS Records Management
  async createDnsRecord(tenantId: string, data: CreateDnsRecordDto): Promise<any> {
    try {
      // Get or create DNS zone for this hostname
      const hostname = data.hostname;
      const zoneName = this.extractZoneName(hostname);
      
      let dnsZone = await this.prisma.dnsZone.findUnique({
        where: { tenantId },
      });

      if (!dnsZone) {
        dnsZone = await this.createDnsZone(tenantId, {
          zoneName,
          provider: data.provider || 'cloudflare',
        });
      }

      const record = await this.prisma.dnsRecord.create({
        data: {
          tenantId,
          dnsZoneId: dnsZone?.id,
          hostname: data.hostname,
          recordType: data.recordType,
          name: data.name,
          value: data.value,
          ttl: data.ttl || 300,
          priority: data.priority,
          status: data.status || 'pending',
          provider: data.provider || 'cloudflare',
          providerRecordId: data.providerRecordId,
          isOwnershipVerification: data.isOwnershipVerification || false,
          isSSLValidation: data.isSSLValidation || false,
          isSystemManaged: data.isSystemManaged || false,
          verifiedAt: data.verifiedAt,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      this.logger.log(`Created DNS record: ${data.hostname} (${data.recordType})`);
      return record;
    } catch (error) {
      this.logger.error(`Failed to create DNS record: ${error.message}`);
      throw error;
    }
  }

  async getDnsRecords(tenantId: string): Promise<any[]> {
    try {
      return await this.prisma.dnsRecord.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get DNS records: ${error.message}`);
      throw error;
    }
  }

  async getDnsRecordsByHostname(hostname: string): Promise<any[]> {
    try {
      return await this.prisma.dnsRecord.findMany({
        where: { hostname },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get DNS records for ${hostname}: ${error.message}`);
      throw error;
    }
  }

  async updateDnsRecord(tenantId: string, recordId: string, data: Partial<UpdateDnsRecordDto>): Promise<any> {
    try {
      const record = await this.prisma.dnsRecord.update({
        where: { id: recordId, tenantId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      this.logger.log(`Updated DNS record: ${recordId}`);
      return record;
    } catch (error) {
      this.logger.error(`Failed to update DNS record: ${error.message}`);
      throw error;
    }
  }

  async deleteDnsRecord(tenantId: string, recordId: string): Promise<void> {
    try {
      await this.prisma.dnsRecord.delete({
        where: { id: recordId, tenantId },
      });
      this.logger.log(`Deleted DNS record: ${recordId}`);
    } catch (error) {
      this.logger.error(`Failed to delete DNS record: ${error.message}`);
      throw error;
    }
  }

  async deleteDnsRecordsByHostname(hostname: string): Promise<number> {
    try {
      const result = await this.prisma.dnsRecord.deleteMany({
        where: { hostname },
      });

      this.logger.log(`Deleted ${result.count} DNS records for ${hostname}`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to delete DNS records for ${hostname}: ${error.message}`);
      throw error;
    }
  }

  // ── Zone Status Polling for Dashboard ───────────────────────
  async pollZoneStatus(tenantId: string, maxAttempts: number = 10): Promise<{ status: string; isActive: boolean }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { customDomain: true, customDomainZoneId: true },
    });

    if (!tenant?.customDomainZoneId) {
      return { status: 'no_domain', isActive: false };
    }

    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const zone = await this.cloudflareService.getZoneStatus(tenant.customDomainZoneId);
        const isActive = zone.status === 'active';
        
        if (isActive) {
          // Update tenant status to active
          await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { 
              customDomainStatus: 'active',
              customDomainVerifiedAt: new Date(),
            },
          });
          
          this.logger.log(`Zone ${tenant.customDomainZoneId} is active for tenant ${tenantId}`);
          return { status: 'active', isActive: true };
        }

        this.logger.log(`Zone status check ${attempts + 1}/${maxAttempts}: ${zone.status}`);
      } catch (error) {
        this.logger.warn(`Zone status check failed: ${error.message}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    return { status: 'pending', isActive: false };
  }

  // Sync with Cloudflare
  async syncFromCloudflare(hostname: string): Promise<void> {
    try {
      const customHostname = await this.cloudflareService.getCustomHostname(hostname);
      if (!customHostname) {
        this.logger.warn(`Custom hostname not found in Cloudflare: ${hostname}`);
        return;
      }

      // Find tenant by custom domain
      const tenant = await this.prisma.tenant.findFirst({
        where: { customDomain: hostname },
        include: { dnsZone: true },
      });

      if (!tenant) {
        this.logger.warn(`Tenant not found for hostname: ${hostname}`);
        return;
      }

      // Get or create DNS zone
      let dnsZone = tenant.dnsZone;
      if (!dnsZone) {
        dnsZone = await this.createDnsZone(tenant.id, {
          zoneName: this.extractZoneName(hostname),
          provider: 'cloudflare',
          providerZoneId: this.cloudflareService['zoneId'],
        });
      }

      // Clear existing records for this hostname
      await this.prisma.dnsRecord.deleteMany({
        where: { hostname },
      });

      // Create records from Cloudflare data
      const records: any[] = [];

      // Ownership verification records
      if (customHostname.ownership_verification && dnsZone) {
        records.push({
          tenantId: tenant.id,
          dnsZoneId: dnsZone.id,
          hostname,
          recordType: 'TXT',
          name: customHostname.ownership_verification.name,
          value: customHostname.ownership_verification.value,
          ttl: 300,
          provider: 'cloudflare',
          status: customHostname.status,
          isOwnershipVerification: true,
          isSystemManaged: true,
        });
      }

      // SSL validation records
      if (customHostname.ssl?.validation_records && dnsZone) {
        for (const validationRecord of customHostname.ssl.validation_records) {
          records.push({
            tenantId: tenant.id,
            dnsZoneId: dnsZone.id,
            hostname,
            recordType: validationRecord.type,
            name: validationRecord.name,
            value: validationRecord.value,
            ttl: 300,
            provider: 'cloudflare',
            status: customHostname.status,
            isSSLValidation: true,
            isSystemManaged: true,
          });
        }
      }

      // Create all records
      if (records.length > 0) {
        await this.prisma.dnsRecord.createMany({
          data: records as any,
        });

        this.logger.log(`Synced ${records.length} DNS records from Cloudflare for ${hostname}`);
      }

      // Update DNS zone status
      await this.prisma.dnsZone.update({
        where: { tenantId: tenant.id },
        data: {
          customDomainStatus: customHostname.status,
          sslStatus: customHostname.ssl?.status || 'pending',
          ownershipStatus: customHostname.ownership_verification ? 'verified' : 'pending',
          lastVerifiedAt: new Date(),
        },
      });

    } catch (error) {
      this.logger.error(`Failed to sync DNS records from Cloudflare for ${hostname}: ${error.message}`);
      throw error;
    }
  }

  // Get verification records from database
  async getVerificationRecords(hostname: string): Promise<{
    ownership: any[];
    ssl: any[];
  }> {
    try {
      const records = await this.getDnsRecordsByHostname(hostname);

      const ownership = records.filter(r => r.isOwnershipVerification);
      const ssl = records.filter(r => r.isSSLValidation);

      return {
        ownership: ownership.map(r => ({
          type: r.recordType,
          name: r.name,
          value: r.value,
          status: r.status,
        })),
        ssl: ssl.map(r => ({
          type: r.recordType,
          name: r.name,
          value: r.value,
          status: r.status,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get verification records: ${error.message}`);
      throw error;
    }
  }

  // Helper methods
  private extractZoneName(hostname: string): string {
    // Extract the domain name from hostname
    // e.g., coffee.co.uk -> co.uk, www.coffee.co.uk -> coffee.co.uk
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  async getDomainStatus(hostname: string): Promise<any> {
    try {
      // First try to get from database
      const records = await this.getDnsRecordsByHostname(hostname);
      
      if (records.length > 0) {
        const existingZone = await this.prisma.dnsZone.findFirst({
          where: {
            dnsRecords: {
              some: { hostname }
            }
          }
        });

        return {
          hostname,
          status: existingZone?.customDomainStatus || 'unknown',
          ownershipVerification: records.find(r => r.isOwnershipVerification),
          sslValidation: records.find(r => r.isSSLValidation),
          source: 'database'
        };
      }

      // Fallback to Cloudflare
      const customHostname = await this.cloudflareService.getCustomHostname(hostname);
      if (customHostname) {
        return {
          hostname,
          status: customHostname.status,
          ownershipVerification: customHostname.ownership_verification,
          sslValidation: customHostname.ssl,
          source: 'cloudflare'
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get domain status: ${error.message}`);
      throw error;
    }
  }
}
