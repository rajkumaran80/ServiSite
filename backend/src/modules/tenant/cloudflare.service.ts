import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CustomHostnameResult {
  id: string;
  txtName: string;
  txtValue: string;
  ownershipName?: string;
  ownershipValue?: string;
}

export interface CustomHostnameStatus {
  active: boolean;
  hostnameStatus: string;
  sslStatus: string;
}

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly apiToken: string;
  private readonly accountId: string;
  private readonly servisiteZoneId: string;
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private readonly config: ConfigService) {
    this.apiToken = config.get<string>('CLOUDFLARE_API_KEY') ?? '';
    this.accountId = config.get<string>('CLOUDFLARE_ACCOUNT_ID') ?? '';
    this.servisiteZoneId = config.get<string>('CLOUDFLARE_ZONE_ID') ?? '';

    if (!this.apiToken || !this.servisiteZoneId) {
      this.logger.warn('CLOUDFLARE_API_KEY or CLOUDFLARE_ZONE_ID not set — custom domain management disabled');
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  // ── Step 1: Create zone for tenant domain ────────────────────────────────

  async createZone(domain: string): Promise<{ zoneId: string; nameservers: string[] }> {
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

  // ── Step 2: Clean up + add CNAME records in tenant zone ──────────────────

  async cleanupTenantZoneDnsRecords(zoneId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records?per_page=100`, {
      headers: this.headers,
    });
    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`CF DNS list failed during cleanup for zone ${zoneId}: ${JSON.stringify(data.errors)}`);
    }

    const toDelete: Array<{ id: string; label: string }> = [];
    for (const record of (data.result ?? [])) {
      const name: string = record.name;
      const type: string = record.type;
      const zoneName: string = record.zone_name;
      const isApex = name === zoneName;
      const isWww = name === `www.${zoneName}`;

      if ((type === 'CNAME' || type === 'A' || type === 'AAAA') && (isApex || isWww)) {
        toDelete.push({ id: record.id, label: `${type} ${name} → ${record.content}` });
      } else if (type === 'TXT' && (name.includes('_cf-custom-hostname') || name.includes('_acme-challenge'))) {
        toDelete.push({ id: record.id, label: `TXT ${name}` });
      }
    }

    this.logger.log(`Cleanup zone ${zoneId}: found ${data.result?.length ?? 0} records, deleting ${toDelete.length}: ${toDelete.map(r => r.label).join(', ') || 'none'}`);

    await Promise.all(
      toDelete.map(async ({ id, label }) => {
        const delRes = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${id}`, {
          method: 'DELETE',
          headers: this.headers,
        });
        const delData = await delRes.json() as any;
        if (!delData.success) {
          this.logger.warn(`Failed to delete DNS record ${label} in zone ${zoneId}: ${JSON.stringify(delData.errors)}`);
        }
      }),
    );
  }

  async addTenantZoneDnsRecords(zoneId: string, tenantSubdomain: string): Promise<void> {
    await Promise.all([
      this.upsertDnsRecord(zoneId, {
        type: 'CNAME',
        name: '@',
        content: tenantSubdomain,
        proxied: true,
      }),
      this.upsertDnsRecord(zoneId, {
        type: 'CNAME',
        name: 'www',
        content: tenantSubdomain,
        proxied: true,
      }),
    ]);
  }

  // ── Step 3: Add Custom Hostnames in servisite zone ───────────────────────

  async createCustomHostnames(domain: string, tenantSubdomain: string): Promise<{
    root: CustomHostnameResult;
    www: CustomHostnameResult;
  }> {
    const [root, www] = await Promise.all([
      this.createOrFetchCustomHostname(domain, tenantSubdomain),
      this.createOrFetchCustomHostname(`www.${domain}`, tenantSubdomain),
    ]);
    return { root, www };
  }

  private async createOrFetchCustomHostname(hostname: string, tenantSubdomain: string): Promise<CustomHostnameResult> {
    const res = await fetch(`${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        hostname,
        ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
        custom_origin_sni_hostname: tenantSubdomain,
      }),
    });
    const data = await res.json() as any;

    if (!data.success) {
      if (data.errors?.[0]?.code === 1414) {
        // Already exists — fetch it, patch SNI, return fresh data
        const existing = await this.fetchCustomHostname(hostname);
        await this.patchCustomHostname(existing.id, tenantSubdomain);
        return this.fetchCustomHostnameById(existing.id);
      }
      throw new Error(`Cloudflare custom hostname error for ${hostname}: ${JSON.stringify(data.errors)}`);
    }

    // Always GET after POST — the creation response doesn't include ownership_verification yet
    return this.fetchCustomHostname(hostname);
  }

  private async fetchCustomHostname(hostname: string): Promise<CustomHostnameResult> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success || !data.result?.length) {
      throw new Error(`Cloudflare custom hostname not found: ${hostname}`);
    }
    return this.extractCustomHostnameResult(data.result[0]);
  }

  private async fetchCustomHostnameById(id: string): Promise<CustomHostnameResult> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames/${id}`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) throw new Error(`Cloudflare custom hostname not found by ID: ${id}`);
    return this.extractCustomHostnameResult(data.result);
  }

  async patchCustomHostname(id: string, tenantSubdomain: string): Promise<void> {
    await fetch(`${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames/${id}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({ custom_origin_sni_hostname: tenantSubdomain }),
    });
  }

  async repairCustomHostnames(
    zoneId: string,
    apexHostnameId: string,
    wwwHostnameId: string,
    tenantSubdomain: string,
  ): Promise<void> {
    // 1. Patch both custom hostnames with correct SNI hostname (fixes Azure 404)
    await Promise.all([
      this.patchCustomHostname(apexHostnameId, tenantSubdomain),
      this.patchCustomHostname(wwwHostnameId, tenantSubdomain),
    ]);
    this.logger.log(`Repair: patched SNI to ${tenantSubdomain}`);

    // 2. Fetch fresh data after patch to get latest TXT values
    const [root, www] = await Promise.all([
      this.fetchCustomHostnameById(apexHostnameId),
      this.fetchCustomHostnameById(wwwHostnameId),
    ]);
    this.logger.log(`Repair — root ownership: ${root.ownershipName ?? 'none'}, www ownership: ${www.ownershipName ?? 'none'}`);

    // 3. Clean up wrong CNAME/A records and stale TXT records in tenant zone
    await this.cleanupTenantZoneDnsRecords(zoneId);

    // 4. Re-add correct CNAME records
    await this.addTenantZoneDnsRecords(zoneId, tenantSubdomain);
    this.logger.log(`Repair: CNAME records set to ${tenantSubdomain}`);

    // 5. Write DCV + ownership TXT records
    await this.addDcvTxtRecords(zoneId, root, www);
    this.logger.log(`Repair complete — all DNS records written to zone ${zoneId}`);
  }

  private extractCustomHostnameResult(result: any): CustomHostnameResult {
    return {
      id: result.id,
      txtName: result.ssl?.txt_name ?? '',
      txtValue: result.ssl?.txt_value ?? '',
      ownershipName: result.ownership_verification?.name,
      ownershipValue: result.ownership_verification?.value,
    };
  }

  // ── Step 4: Add DCV + ownership TXT records in tenant zone ─────────────

  async addDcvTxtRecords(
    zoneId: string,
    root: CustomHostnameResult,
    www: CustomHostnameResult,
  ): Promise<void> {
    const records: Array<{ type: string; name: string; content: string; proxied: boolean }> = [];

    if (root.txtName && root.txtValue) {
      records.push({ type: 'TXT', name: root.txtName, content: root.txtValue, proxied: false });
    }
    if (root.ownershipName && root.ownershipValue) {
      records.push({ type: 'TXT', name: root.ownershipName, content: root.ownershipValue, proxied: false });
    }
    if (www.txtName && www.txtValue) {
      records.push({ type: 'TXT', name: www.txtName, content: www.txtValue, proxied: false });
    }
    if (www.ownershipName && www.ownershipValue) {
      records.push({ type: 'TXT', name: www.ownershipName, content: www.ownershipValue, proxied: false });
    }

    await Promise.all(records.map((r) => this.upsertDnsRecord(zoneId, r)));
  }

  // ── Step 7: Poll custom hostname status ──────────────────────────────────

  async getCustomHostnameStatus(id: string): Promise<CustomHostnameStatus> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames/${id}`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`Cloudflare custom hostname status error: ${JSON.stringify(data.errors)}`);
    }
    const result = data.result;
    return {
      active: result.status === 'active' && result.ssl?.status === 'active',
      hostnameStatus: result.status,
      sslStatus: result.ssl?.status ?? 'unknown',
    };
  }

  async areBothCustomHostnamesActive(rootId: string, wwwId: string): Promise<boolean> {
    const [root, www] = await Promise.all([
      this.getCustomHostnameStatus(rootId),
      this.getCustomHostnameStatus(wwwId),
    ]);
    return root.active && www.active;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  async deleteCustomHostname(id: string): Promise<void> {
    if (!id) return;
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames/${id}`,
      { method: 'DELETE', headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) {
      this.logger.warn(`Failed to delete custom hostname ${id}: ${JSON.stringify(data.errors)}`);
    }
  }

  async deleteZone(zoneId: string): Promise<void> {
    if (!zoneId) return;
    const res = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    const data = await res.json() as any;
    if (!data.success) {
      this.logger.warn(`Failed to delete zone ${zoneId}: ${JSON.stringify(data.errors)}`);
    }
  }

  // ── One-time setup: fallback origin ─────────────────────────────────────

  async setupFallbackOrigin(): Promise<void> {
    const origin = this.config.get<string>('CLOUDFLARE_FALLBACK_ORIGIN', 'origin.servisite.co.uk');
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames/fallback_origin`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({ origin }),
      },
    );
    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`Cloudflare fallback origin setup error: ${JSON.stringify(data.errors)}`);
    }
    this.logger.log(`Fallback origin set to: ${origin}`);
  }

  async getFallbackOriginStatus(): Promise<{ origin: string; status: string }> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/custom_hostnames/fallback_origin`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) {
      throw new Error(`Cloudflare fallback origin fetch error: ${JSON.stringify(data.errors)}`);
    }
    return {
      origin: data.result?.origin ?? '',
      status: data.result?.status ?? 'unknown',
    };
  }

  // ── Rate Limiting (unchanged) ─────────────────────────────────────────────

  async setupRateLimiting(): Promise<{ rulesApplied: number }> {
    if (!this.apiToken || !this.servisiteZoneId) {
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
          mitigation_timeout: 600,
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
          mitigation_timeout: 3600,
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
      `${this.baseUrl}/zones/${this.servisiteZoneId}/rulesets/phases/http_ratelimit/entrypoint`,
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

    this.logger.log(`Rate limiting configured: ${rules.length} rules applied`);
    return { rulesApplied: rules.length };
  }

  async purgeWorkerDomainCache(domain: string): Promise<void> {
    const kvNamespaceId = this.config.get<string>('CLOUDFLARE_KV_DOMAIN_CACHE_ID');
    if (!kvNamespaceId) {
      this.logger.warn('CLOUDFLARE_KV_DOMAIN_CACHE_ID not set — skipping KV cache purge');
      return;
    }

    const keys = [domain, `www.${domain}`, domain.replace(/^www\./, '')].filter(
      (v, i, a) => a.indexOf(v) === i,
    );

    await Promise.all(
      keys.map(async (key) => {
        const res = await fetch(
          `${this.baseUrl}/accounts/${this.accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${encodeURIComponent(key)}`,
          { method: 'DELETE', headers: this.headers },
        );
        const data = await res.json() as any;
        if (data.success) {
          this.logger.log(`KV cache purged: ${key}`);
        }
      }),
    );
  }

  async getRateLimitingRules(): Promise<any[]> {
    const res = await fetch(
      `${this.baseUrl}/zones/${this.servisiteZoneId}/rulesets/phases/http_ratelimit/entrypoint`,
      { headers: this.headers },
    );
    const data = await res.json() as any;
    if (!data.success) return [];
    return data.result?.rules ?? [];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async upsertDnsRecord(zoneId: string, record: {
    type: string; name: string; content: string; proxied?: boolean; comment?: string;
  }): Promise<void> {
    const listRes = await fetch(
      `${this.baseUrl}/zones/${zoneId}/dns_records?type=${record.type}&name=${encodeURIComponent(record.name)}`,
      { headers: this.headers },
    );
    const listData = await listRes.json() as any;
    if (!listData.success) {
      throw new Error(`CF DNS list failed for zone ${zoneId} [${record.type} ${record.name}]: ${JSON.stringify(listData.errors)}`);
    }
    const existing = listData.result?.[0];

    let writeRes: Response;
    if (existing) {
      writeRes = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${existing.id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(record),
      });
    } else {
      writeRes = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(record),
      });
    }
    const writeData = await writeRes.json() as any;
    if (!writeData.success) {
      // CF error 81053: a conflicting record exists, possibly stored under the full domain name
      // rather than '@'. List all records and find the conflicting A/AAAA/CNAME by position.
      if (!existing && writeData.errors?.[0]?.code === 81053) {
        const allRes = await fetch(
          `${this.baseUrl}/zones/${zoneId}/dns_records?per_page=100`,
          { headers: this.headers },
        );
        const allData = await allRes.json() as any;
        const isApex = record.name === '@';
        const conflict = allData.result?.find((r: any) => {
          if (r.type !== 'A' && r.type !== 'AAAA' && r.type !== 'CNAME') return false;
          if (isApex) return r.name === r.zone_name || r.name === '@';
          if (record.name === 'www') return r.name === `www.${r.zone_name}` || r.name === 'www';
          return r.name === record.name;
        });
        if (conflict) {
          const fixRes = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${conflict.id}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify(record),
          });
          const fixData = await fixRes.json() as any;
          if (!fixData.success) {
            throw new Error(`CF DNS write failed for zone ${zoneId} [${record.type} ${record.name}]: ${JSON.stringify(fixData.errors)}`);
          }
          this.logger.log(`DNS upserted (conflict resolved): zone=${zoneId} ${record.type} ${record.name} → ${record.content}`);
          return;
        }
      }
      throw new Error(`CF DNS write failed for zone ${zoneId} [${record.type} ${record.name}]: ${JSON.stringify(writeData.errors)}`);
    }
    this.logger.log(`DNS upserted: zone=${zoneId} ${record.type} ${record.name} → ${record.content}`);
  }
}


