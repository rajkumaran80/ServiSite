# Custom Domain Setup

## Architecture

Tenant custom domains use **Full Zone Delegation + Cloudflare for SaaS**:

- Tenant changes nameservers at their registrar (IONOS, GoDaddy, etc.) to Cloudflare
- Cloudflare manages the tenant's full DNS zone
- Cloudflare for SaaS issues SSL certificates for the tenant domain
- Traffic flows: `coffee.co.uk` → Cloudflare → `origin.servisite.co.uk` → Azure App Service
- Main site (`servisite.co.uk`, `www`) continues to route through Azure Front Door

---

## servisite.co.uk DNS Records (one-time platform setup)

These records must be set in the **servisite.co.uk Cloudflare zone**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `servisite.co.uk` | `servisite-prod-endpoint-afdnhugfdxaqfpec.z03.azurefd.net` | Proxied |
| CNAME | `www` | `servisite-prod-endpoint-afdnhugfdxaqfpec.z03.azurefd.net` | Proxied |
| CNAME | `origin` | `servisite-prod-frontend.azurewebsites.net` | Proxied |
| CNAME | `*` | `origin.servisite.co.uk` | Proxied |
| CNAME | `media` | `servisiteprodmedia.blob.core.windows.net` | Proxied |

- `origin` is Proxied so the real Azure IP is never exposed publicly
- `*` wildcard routes all tenant subdomains (`lacafe.servisite.co.uk`) through Cloudflare → App Service

---

## One-Time Cloudflare for SaaS Setup

Run once after DNS records are in place:

```
POST /api/v1/superadmin/cloudflare/fallback-origin
```

This sets `origin.servisite.co.uk` as the fallback origin for all Custom Hostnames. All tenant custom domain traffic routes to this origin automatically.

Also ensure **Cloudflare for SaaS** is enabled on the servisite.co.uk zone:
Cloudflare Dashboard → servisite.co.uk → SSL/TLS → Custom Hostnames → Enable

---

## Automated Tenant Domain Onboarding (what the backend does)

When a tenant saves a custom domain in Settings, the backend runs these steps automatically:

### Step 1 — Create Cloudflare Zone
Creates a DNS zone for `coffee.co.uk` under the ServiSite Cloudflare account. Returns the two nameservers the tenant must set at their registrar.

### Step 2 — Add DNS Records in Tenant Zone
Adds to the `coffee.co.uk` zone:
- `CNAME @ → coffee.servisite.co.uk` (Proxied)
- `CNAME www → coffee.servisite.co.uk` (Proxied)

Both point to the tenant's ServiSite subdomain, which resolves via the `*` wildcard to `origin.servisite.co.uk`.

### Step 3 — Create Custom Hostnames in servisite.co.uk Zone
Adds two Custom Hostnames in the **servisite.co.uk** zone:
- `coffee.co.uk`
- `www.coffee.co.uk`

Each uses TXT-based DCV (Domain Control Validation) for SSL issuance. The response contains TXT record names and values needed for Step 4.

### Step 4 — Add DCV TXT Records in Tenant Zone
Adds SSL validation TXT records to the `coffee.co.uk` zone:
- `_cf-custom-hostname.coffee.co.uk` TXT → `<token from step 3>`
- `_cf-custom-hostname.www.coffee.co.uk` TXT → `<token from step 3>`

Cloudflare uses these to issue SSL certificates for both hostnames.

### Step 5 — Save to DB
Saves to the tenant record:
- `customDomain` = `coffee.co.uk`
- `customDomainZoneId` = Cloudflare zone ID
- `customDomainApexToken` = Custom Hostname ID for root
- `customDomainToken` = Custom Hostname ID for www
- `customDomainNsRecords` = nameservers shown to tenant
- `customDomainStatus` = `pending`

---

## The One Manual Step (Tenant)

After saving the domain, the tenant is shown nameservers and must update them at their registrar:

**IONOS:** Domains & SSL → Nameservers → Change → Custom → Replace all with Cloudflare nameservers

**GoDaddy:** My Products → domain → DNS → Nameservers → Change → Enter my own

Example nameservers (assigned per zone — use the actual values shown in the dashboard):
```
odin.ns.cloudflare.com
ryleigh.ns.cloudflare.com
```

Nameserver propagation: typically 1–2 hours, up to 24 hours.

---

## Activation (Automatic + Manual)

### Background Polling (automatic)
`DomainPollerService` runs every 60 seconds. For every tenant with `customDomainStatus = pending`, it checks both Custom Hostname statuses via Cloudflare API. When both `status = active` and `ssl.status = active`, the domain is automatically marked active in the DB.

### Manual Check Status
The tenant can also click **Check Status** in Settings → Domain at any time to force an immediate check. The result is shown inline in red if still pending (with root and www SSL status detail), or triggers activation if ready.

---

## DB Fields Reference

| Field | Value |
|-------|-------|
| `customDomain` | `coffee.co.uk` |
| `customDomainStatus` | `pending` → `active` |
| `customDomainZoneId` | Cloudflare zone ID for `coffee.co.uk` |
| `customDomainApexToken` | Cloudflare Custom Hostname ID for root |
| `customDomainToken` | Cloudflare Custom Hostname ID for www |
| `customDomainNsRecords` | Nameservers shown to tenant |
| `customDomainVerifiedAt` | Timestamp when activated |

---

## Traffic Flow (when active)

```
Browser → coffee.co.uk
  → Cloudflare (coffee.co.uk zone, Custom Hostname SSL cert)
  → Fallback origin: origin.servisite.co.uk
  → Azure App Service (servisite-prod-frontend)
  → Next.js reads Host: coffee.co.uk → resolves tenant → serves site
```

Tenant subdomains (no custom domain):
```
Browser → lacafe.servisite.co.uk
  → Cloudflare (* wildcard in servisite.co.uk zone)
  → origin.servisite.co.uk → Azure App Service
```

Main SaaS site:
```
Browser → servisite.co.uk / www.servisite.co.uk
  → Cloudflare → Azure Front Door → Azure App Service
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Check Status shows SSL pending | Nameservers not propagated yet | Wait 1–24h after nameserver change |
| Check Status shows "hostname not found" | Custom Hostname creation failed | Remove domain and re-add it |
| Domain goes active but returns wrong site | Tenant slug mismatch in CNAME | Verify `CNAME @ → {slug}.servisite.co.uk` in tenant zone |
| SSL active but site unreachable | Fallback origin not set | Call `POST /superadmin/cloudflare/fallback-origin` |
| Zone shows "pending" indefinitely | Nameservers not updated at registrar | Tenant must change nameservers |
