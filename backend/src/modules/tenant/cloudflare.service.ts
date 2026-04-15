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
  private readonly accountId: string;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private readonly config: ConfigService) {
    this.apiToken = config.get<string>('CLOUDFLARE_API_KEY') ?? '';
    this.zoneId = config.get<string>('CLOUDFLARE_ZONE_ID') ?? '';
    this.accountId = config.get<string>('CLOUDFLARE_ACCOUNT_ID') ?? '';

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

  // ── Zone Management (customer DNS) ────────────────────────────────────────

  /**
   * Create a Cloudflare DNS zone for a customer domain.
   * Returns the zone ID and nameservers they must set at their registrar.
   */
  async createZone(domain: string): Promise<{ zoneId: string; nameservers: string[] }> {
    // Check if zone already exists
    const existing = await this.findZone(domain);
    if (existing) return existing;

    const res = await fetch(`${this.baseUrl}/zones`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        name: domain,
        account: { id: this.accountId },
        jump_start: false,
      }),
    });
    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`Cloudflare zone create error: ${JSON.stringify(data.errors)}`);
    }
    return {
      zoneId: data.result.id,
      nameservers: data.result.name_servers ?? [],
    };
  }

  /** Find an existing zone by domain name. */
  async findZone(domain: string): Promise<{ zoneId: string; nameservers: string[] } | null> {
    const res = await fetch(
      `${this.baseUrl}/zones?name=${encodeURIComponent(domain)}&account.id=${this.accountId}`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success || !data.result?.length) return null;
    const zone = data.result[0];
    return { zoneId: zone.id, nameservers: zone.name_servers ?? [] };
  }

  /**
   * Add all required DNS records to a customer zone:
   * - CNAME www → origin.servisite.co.uk (proxied — SSL via Cloudflare Universal SSL)
   * - Redirect rule: apex → www
   */
  async setupZoneDnsRecords(zoneId: string, domain: string): Promise<void> {
    await Promise.all([
      this.upsertDnsRecord(zoneId, {
        type: 'CNAME',
        name: 'www',
        content: 'origin.servisite.co.uk',
        proxied: true,
        comment: 'ServiSite — do not edit',
      }),
      // Proxied A placeholder for apex so Cloudflare can apply redirect rules
      this.upsertDnsRecord(zoneId, {
        type: 'A',
        name: '@',
        content: '192.0.2.1', // dummy IP — Cloudflare intercepts before it's ever used
        proxied: true,
        comment: 'ServiSite apex placeholder — redirect rule handles routing',
      }),
    ]);

    // Add a Cloudflare redirect rule: apex → www
    await this.upsertRedirectRule(zoneId, domain);
  }

  /** Add or update a single DNS record (idempotent). */
  private async upsertDnsRecord(zoneId: string, record: {
    type: string; name: string; content: string; proxied?: boolean; comment?: string;
  }): Promise<void> {
    // Check if it already exists
    const listRes = await fetch(
      `${this.baseUrl}/zones/${zoneId}/dns_records?type=${record.type}&name=${encodeURIComponent(record.name)}`,
      { headers: this.headers },
    );
    const listData = await listRes.json() as any;
    const existing = listData.result?.[0];

    if (existing) {
      await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${existing.id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(record),
      });
    } else {
      await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(record),
      });
    }
  }

  /** Create a Cloudflare redirect rule for apex → www (idempotent). */
  private async upsertRedirectRule(zoneId: string, domain: string): Promise<void> {
    const listRes = await fetch(
      `${this.baseUrl}/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
      { headers: this.headers },
    );
    const listData = await listRes.json() as any;

    // If ruleset already exists with our rule, skip
    if (listData.success && listData.result?.rules?.some((r: any) => r.description === 'ServiSite apex redirect')) {
      return;
    }

    await fetch(
      `${this.baseUrl}/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          rules: [
            {
              description: 'ServiSite apex redirect',
              expression: `(http.host eq "${domain}")`,
              action: 'redirect',
              action_parameters: {
                from_value: {
                  status_code: 301,
                  target_url: { expression: `concat("https://www.${domain}", http.request.uri.path)` },
                  preserve_query_string: true,
                },
              },
            },
          ],
        }),
      },
    );
  }

  /**
   * Check whether the customer has pointed their nameservers to Cloudflare.
   * Returns true once the zone is active.
   */
  async checkZoneActive(zoneId: string): Promise<{ active: boolean; status: string }> {
    const res = await fetch(`${this.baseUrl}/zones/${zoneId}`, { headers: this.headers });
    const data = await res.json() as any;
    if (!data.success) throw new Error(`Cloudflare zone check error: ${JSON.stringify(data.errors)}`);
    return {
      active: data.result.status === 'active',
      status: data.result.status,
    };
  }

  /** Delete the customer's Cloudflare zone entirely. */
  async deleteZone(zoneId: string): Promise<void> {
    if (!zoneId) return;
    const res = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    const data = await res.json() as any;
    if (!data.success) {
      this.logger.warn(`Failed to delete Cloudflare zone ${zoneId}: ${JSON.stringify(data.errors)}`);
    }
  }

  // ── Custom Hostnames (Cloudflare for SaaS — legacy, kept for existing tenants) ──

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
        ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } },
      }),
    });

    const data = await res.json() as any;

    if (!data.success) {
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

  async checkCustomHostname(id: string): Promise<{
    active: boolean;
    sslStatus: string;
    hostnameStatus: string;
    sslTxtName?: string;
    sslTxtValue?: string;
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
      active: result.status === 'active',
      sslStatus: result.ssl.status,
      hostnameStatus: result.status,
      sslTxtName: result.ssl.txt_name,
      sslTxtValue: result.ssl.txt_value,
    };
  }

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

  // ── Rate Limiting ─────────────────────────────────────────────────────────

  /**
   * Set up rate limiting rules on the ServiSite zone.
   * Safe to call multiple times — replaces the entire ruleset each time.
   *
   * Rules applied:
   *  - Auth endpoints (login, forgot-password, reset-password): 10 req / 60s per IP → block 10 min
   *  - Registration endpoint: 5 req / 60s per IP → block 1 hour
   *  - API global: 300 req / 60s per IP → block 1 min
   */
  async setupRateLimiting(): Promise<{ rulesApplied: number }> {
    if (!this.apiToken || !this.zoneId) {
      throw new Error('Cloudflare credentials not configured');
    }

    const rules = [
      {
        description: 'Auth endpoints — brute force protection',
        expression: '(http.request.uri.path matches "^/api/v1/auth/(login|forgot-password|reset-password|resend-verification)$")',
        ratelimit: {
          characteristics: ['ip.src'],
          period: 60,
          requests_per_period: 10,
          mitigation_timeout: 600, // block for 10 minutes
        },
        action: 'block',
      },
      {
        description: 'Registration endpoint — signup abuse protection',
        expression: '(http.request.uri.path eq "/api/v1/tenants/register" or http.request.uri.path eq "/api/v1/auth/register")',
        ratelimit: {
          characteristics: ['ip.src'],
          period: 60,
          requests_per_period: 5,
          mitigation_timeout: 3600, // block for 1 hour
        },
        action: 'block',
      },
      {
        description: 'API global rate limit',
        expression: '(http.request.uri.path matches "^/api/")',
        ratelimit: {
          characteristics: ['ip.src'],
          period: 60,
          requests_per_period: 300,
          mitigation_timeout: 60,
        },
        action: 'block',
      },
    ];

    const res = await fetch(
      `${this.baseUrl}/zones/${this.zoneId}/rulesets/phases/http_ratelimit/entrypoint`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({ rules }),
      },
    );

    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`Cloudflare rate limit setup error: ${JSON.stringify(data.errors)}`);
    }

    this.logger.log(`Rate limiting configured: ${rules.length} rules applied to zone ${this.zoneId}`);
    return { rulesApplied: rules.length };
  }

  /** Get current rate limiting rules on the zone. */
  async getRateLimitingRules(): Promise<any[]> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.zoneId}/rulesets/phases/http_ratelimit/entrypoint`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) return [];
    return data.result?.rules ?? [];
  }
}
