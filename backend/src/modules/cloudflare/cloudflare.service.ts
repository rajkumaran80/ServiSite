import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface CustomHostname {
  id: string;
  hostname: string;
  status: 'pending' | 'active' | 'deleted';
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  ssl?: {
    status: 'pending' | 'active' | 'error';
    validation_records?: Array<{
      type: string;
      name: string;
      value: string;
    }>;
  };
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly apiToken: string;
  private readonly zoneId: string;
  private readonly zoneName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiToken = this.configService.get<string>('CLOUDFLARE_API_KEY') || '';
    this.zoneId = this.configService.get<string>('CLOUDFLARE_ZONE_ID') || '';
    this.zoneName = this.configService.get<string>('CLOUDFLARE_ZONE_NAME', 'servisite.co.uk');

    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('Cloudflare credentials not configured');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://api.cloudflare.com/client/v4${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      return data.result;
    } catch (error) {
      this.logger.error(`Cloudflare API request failed: ${error.message}`);
      throw error;
    }
  }

  async getZone(): Promise<CloudflareZone> {
    return this.makeRequest(`/zones/${this.zoneId}`);
  }

  async addCustomHostname(hostname: string): Promise<CustomHostname> {
    this.logger.log(`Adding custom hostname: ${hostname}`);

    try {
      const result = await this.makeRequest(`/zones/${this.zoneId}/custom_hostnames`, {
        method: 'POST',
        body: JSON.stringify({
          hostname,
          ssl: {
            method: 'txt',
            type: 'dv',
          },
        }),
      });

      this.logger.log(`Custom hostname added successfully: ${hostname}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to add custom hostname ${hostname}: ${error.message}`);
      throw error;
    }
  }

  async getCustomHostname(hostname: string): Promise<CustomHostname | null> {
    try {
      const result = await this.makeRequest(`/zones/${this.zoneId}/custom_hostnames?hostname=${hostname}`);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get custom hostname ${hostname}: ${error.message}`);
      return null;
    }
  }

  async getCustomHostnames(): Promise<CustomHostname[]> {
    try {
      const result = await this.makeRequest(`/zones/${this.zoneId}/custom_hostnames`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get custom hostnames: ${error.message}`);
      return [];
    }
  }

  async deleteCustomHostname(hostnameId: string): Promise<void> {
    this.logger.log(`Deleting custom hostname: ${hostnameId}`);

    try {
      await this.makeRequest(`/zones/${this.zoneId}/custom_hostnames/${hostnameId}`, {
        method: 'DELETE',
      });

      this.logger.log(`Custom hostname deleted successfully: ${hostnameId}`);
    } catch (error) {
      this.logger.error(`Failed to delete custom hostname ${hostnameId}: ${error.message}`);
      throw error;
    }
  }

  async deleteCustomHostnameByDomain(hostname: string): Promise<void> {
    const customHostname = await this.getCustomHostname(hostname);
    if (!customHostname) {
      this.logger.warn(`Custom hostname not found: ${hostname}`);
      return;
    }

    await this.deleteCustomHostname(customHostname.id);
  }

  async clearAllCustomHostnames(): Promise<void> {
    this.logger.log('Clearing all custom hostnames');

    try {
      const hostnames = await this.getCustomHostnames();
      
      await Promise.all(
        hostnames.map(hostname => this.deleteCustomHostname(hostname.id))
      );

      this.logger.log(`Cleared ${hostnames.length} custom hostnames`);
    } catch (error) {
      this.logger.error(`Failed to clear custom hostnames: ${error.message}`);
      throw error;
    }
  }

  async getHostnameOwnershipVerification(hostname: string): Promise<any> {
    const customHostname = await this.getCustomHostname(hostname);
    if (!customHostname || !customHostname.ownership_verification) {
      throw new Error('Ownership verification not available');
    }

    return customHostname.ownership_verification;
  }

  async getHostnameSSLValidation(hostname: string): Promise<any> {
    const customHostname = await this.getCustomHostname(hostname);
    if (!customHostname || !customHostname.ssl?.validation_records) {
      throw new Error('SSL validation records not available');
    }

    return customHostname.ssl.validation_records;
  }

  async checkHostnameStatus(hostname: string): Promise<CustomHostname> {
    const customHostname = await this.getCustomHostname(hostname);
    if (!customHostname) {
      throw new Error('Custom hostname not found');
    }

    return customHostname;
  }

  async getOriginFallbackSettings(): Promise<any> {
    // This would configure origin.servisite.co.uk to point to Azure App Service
    return {
      hostname: `origin.${this.zoneName}`,
      origin: this.configService.get<string>('AZURE_APP_SERVICE_URL'),
      port: 443,
      ssl: true,
    };
  }
}
