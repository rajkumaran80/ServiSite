import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CloudflareCustomHostname {
  id: string;
  hostname: string;
  ssl: {
    status: string;
    txt_name?: string;
    txt_value?: string;
  };
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  status: string;
}

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly apiToken: string;
  private readonly zoneId: string;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private readonly config: ConfigService) {
    this.apiToken = config.get<string>('CLOUDFLARE_API_KEY') ?? '';
    this.zoneId = config.get<string>('CLOUDFLARE_ZONE_ID') ?? '';

    if (!this.apiToken || !this.zoneId) {
      this.logger.warn('CLOUDFLARE_API_KEY or CLOUDFLARE_ZONE_ID not set — custom domain management disabled');
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a custom hostname in Cloudflare for SaaS.
   * Returns the ownership verification TXT record the tenant must add.
   */
  async createCustomHostname(hostname: string): Promise<{
    id: string;
    txtName: string;
    txtValue: string;
  }> {
    const res = await fetch(`${this.baseUrl}/zones/${this.zoneId}/custom_hostnames`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        hostname,
        ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
      }),
    });

    const data = await res.json() as any;

    if (!data.success) {
      // If hostname already exists, fetch it instead
      if (data.errors?.[0]?.code === 1414) {
        return this.getCustomHostnameByHostname(hostname);
      }
      throw new Error(`Cloudflare error: ${JSON.stringify(data.errors)}`);
    }

    const result: CloudflareCustomHostname = data.result;
    return {
      id: result.id,
      txtName: result.ownership_verification?.name ?? `_cf-custom-hostname.${hostname}`,
      txtValue: result.ownership_verification?.value ?? '',
    };
  }

  /**
   * Look up an existing custom hostname by hostname string.
   */
  async getCustomHostnameByHostname(hostname: string): Promise<{
    id: string;
    txtName: string;
    txtValue: string;
  }> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success || !data.result?.length) {
      throw new Error(`Cloudflare hostname not found: ${hostname}`);
    }
    const result: CloudflareCustomHostname = data.result[0];
    return {
      id: result.id,
      txtName: result.ownership_verification?.name ?? `_cf-custom-hostname.${hostname}`,
      txtValue: result.ownership_verification?.value ?? '',
    };
  }

  /**
   * Check the status of a custom hostname.
   * Returns true if SSL is active and hostname is active.
   */
  async checkCustomHostname(id: string): Promise<{
    active: boolean;
    sslStatus: string;
    hostnameStatus: string;
  }> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.zoneId}/custom_hostnames/${id}`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`Cloudflare error: ${JSON.stringify(data.errors)}`);
    }
    const result: CloudflareCustomHostname = data.result;
    return {
      active: result.status === 'active' && result.ssl.status === 'active',
      sslStatus: result.ssl.status,
      hostnameStatus: result.status,
    };
  }

  /**
   * Delete a custom hostname from Cloudflare (when tenant removes their domain).
   */
  async deleteCustomHostname(id: string): Promise<void> {
    if (!id) return;
    const res = await fetch(
      `${this.baseUrl}/zones/${this.zoneId}/custom_hostnames/${id}`,
      { method: 'DELETE', headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) {
      this.logger.warn(`Failed to delete Cloudflare custom hostname ${id}: ${JSON.stringify(data.errors)}`);
    }
  }
}
