# ServiSite — Custom Domain Setup

## Architecture Overview

Tenants can connect their own domain (e.g. `la-cafe.co.uk`) so their ServiSite page is served there instead of `lacafe.servisite.co.uk`.

```
User visits www.la-cafe.co.uk
    ↓
Cloudflare (la-cafe.co.uk zone — tenant's domain)
  CNAME @ → lacafe.servisite.co.uk  (Proxied)
  CNAME www → lacafe.servisite.co.uk  (Proxied)
    ↓
Cloudflare (servisite.co.uk zone — our platform)
  Custom Hostname registered: www.la-cafe.co.uk
  Worker (servisite-router) intercepts request
  Calls backend → resolves slug → rewrites to lacafe.servisite.co.uk
    ↓
Azure Front Door
  Receives Host: lacafe.servisite.co.uk  ✅
    ↓
Next.js app — serves La Cafe's page
```

**Why the Worker is necessary:** Azure Front Door routes by HTTP Host header. It only knows `lacafe.servisite.co.uk` — it has never heard of `la-cafe.co.uk`. Cloudflare preserves the original Host header by default. The Worker swaps it before the request reaches Azure.

---

## servisite.co.uk DNS Records (platform zone — one-time setup)

These records are set manually in the **servisite.co.uk Cloudflare zone**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `servisite.co.uk` (apex) | `servisite-prod-endpoint-afdnhugfdxaqfpec.z03.azurefd.net` | Proxied |
| CNAME | `www` | `servisite.co.uk` | Proxied |
| CNAME | `*` | `servisite.co.uk` | Proxied |
| CNAME | `media` | `servisiteprodmedia.blob.core.windows.net` | Proxied |
| CNAME | `origin` | `servisite-prod-frontend.azurewebsites.net` | Proxied |

**Record purposes:**
- `servisite.co.uk` apex → Azure Front Door (main entry point)
- `www` → apex (redirects www to apex)
- `*` wildcard → apex — routes all tenant subdomains (`lacafe.servisite.co.uk`) through Cloudflare to Azure FD
- `media` → Azure Blob Storage for uploaded images
- `origin` → Azure App Service directly — used as **CF for SaaS fallback origin** (safety net only, never hit under normal operation since the Worker handles all custom domain traffic)

---

## Cloudflare for SaaS — One-Time Platform Setup

### 1. Enable Custom Hostnames
Cloudflare Dashboard → servisite.co.uk → SSL/TLS → Custom Hostnames → Enable

### 2. Set Fallback Origin
```
POST /api/v1/superadmin/cloudflare/fallback-origin
```
Sets `origin.servisite.co.uk` as the fallback destination for Custom Hostname traffic if the Worker fails. Requires the `origin` DNS record to exist.

### 3. Cloudflare Worker (servisite-router)
The Worker intercepts all requests in the servisite.co.uk zone and rewrites custom domain traffic.

**Deploy:**
```bash
cd worker
npm install
npx wrangler login
npm run deploy
```

**How it works:**
1. Request arrives for `www.la-cafe.co.uk`
2. Worker checks `DOMAIN_CACHE` KV for cached slug
3. Cache hit → rewrites to `lacafe.servisite.co.uk` immediately
4. Cache miss → calls `https://api.servisite.co.uk/api/v1/tenant/by-domain?domain=www.la-cafe.co.uk` → gets `{ slug: "lacafe" }` → stores in KV (30-day TTL) → rewrites
5. Fetch is made to `lacafe.servisite.co.uk` — Azure FD receives correct Host header

**Worker KV namespace:**
- Name: `servisite-router-DOMAIN_CACHE`
- ID: `53cced6523ba4aa1a0f02a5b00418c6c`
- TTL: 30 days (domains rarely change)

---

## Automated Tenant Domain Onboarding

When a tenant saves a custom domain in Settings, the backend runs these steps:

### Step 1 — Create Cloudflare Zone
Creates a DNS zone for `la-cafe.co.uk` under the ServiSite Cloudflare account. Returns the two nameservers the tenant must set at their registrar.

### Step 2 — Add CNAME Records in Tenant Zone
Adds to the `la-cafe.co.uk` zone:
- `CNAME @ → lacafe.servisite.co.uk` (Proxied)
- `CNAME www → lacafe.servisite.co.uk` (Proxied)

Both point to the tenant's ServiSite subdomain, which routes through the `*` wildcard to Azure FD.

### Step 3 — Create Custom Hostnames in servisite.co.uk Zone
Adds two Custom Hostnames in the **servisite.co.uk** zone:
- `la-cafe.co.uk` (apex)
- `www.la-cafe.co.uk`

Custom Hostnames tell Cloudflare that these domains belong to the servisite.co.uk zone for SSL and routing purposes.

### Step 4 — Write TXT Validation Records in Tenant Zone
After creating Custom Hostnames, the backend GETs their details from CF API to retrieve validation tokens, then writes up to 4 TXT records to the tenant zone:

| Name | Purpose |
|------|---------|
| `_acme-challenge.la-cafe.co.uk` | DCV (Domain Control Validation) for apex SSL |
| `_cf-custom-hostname.la-cafe.co.uk` | Ownership pre-validation for apex (required because proxied apex CNAME cannot be followed by CF for validation) |
| `_acme-challenge.www.la-cafe.co.uk` | DCV for www SSL |
| `_cf-custom-hostname.www.la-cafe.co.uk` | Ownership pre-validation for www |

### Step 5 — Tenant Updates Nameservers
Tenant goes to their registrar (IONOS, GoDaddy, etc.) and replaces their nameservers with the Cloudflare ones shown in the dashboard.

Typical propagation: 1–2 hours, up to 24 hours.

### Step 6 — Domain Activates
Once Cloudflare processes the TXT records and nameservers propagate, both Custom Hostnames become `active`. The backend polls this status and marks `customDomainStatus = 'active'` in the DB.

---

## Custom Domain DNS Records (tenant zone — la-cafe.co.uk example)

These are written automatically by the backend. The tenant also keeps their own MX/SPF records:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `la-cafe.co.uk` (apex) | `lacafe.servisite.co.uk` | Proxied |
| CNAME | `www` | `lacafe.servisite.co.uk` | Proxied |
| TXT | `_acme-challenge.la-cafe.co.uk` | `<DCV token from CF>` | DNS only |
| TXT | `_cf-custom-hostname.la-cafe.co.uk` | `<ownership token from CF>` | DNS only |
| TXT | `_acme-challenge.www.la-cafe.co.uk` | `<DCV token from CF>` | DNS only |
| TXT | `_cf-custom-hostname.www.la-cafe.co.uk` | `<ownership token from CF>` | DNS only |
| MX | `la-cafe.co.uk` | `mx00.ionos.co.uk` / `mx01.ionos.co.uk` | DNS only |
| TXT | `la-cafe.co.uk` | `v=spf1 include:_spf-eu.ionos.com ~all` | DNS only |
| TXT | `_dnsauth` | `<IONOS domain verification token>` | DNS only |

---

## DB Fields Reference

| Field | Value |
|-------|-------|
| `customDomain` | `la-cafe.co.uk` (apex, no www prefix) |
| `customDomainStatus` | `pending` → `active` |
| `customDomainZoneId` | Cloudflare zone ID for the tenant's domain |
| `customDomainApexToken` | CF Custom Hostname ID for apex |
| `customDomainToken` | CF Custom Hostname ID for www |
| `customDomainNsRecords` | Nameservers shown to tenant |
| `customDomainVerifiedAt` | Timestamp when activated |

---

## Superadmin Actions

### Fix Domain DNS
`POST /api/v1/superadmin/tenants/:id/repair-domain`

Use when DNS records are wrong or missing. Does:
1. PATCHes both CF Custom Hostnames
2. Cleans up stale CNAME/TXT records in tenant zone
3. Re-writes correct CNAME records
4. Re-writes DCV + ownership TXT records
5. If both CF hostnames are already `active`, marks domain as `active` in DB

### Purge Domain Cache
`POST /api/v1/superadmin/tenants/:id/purge-domain-cache`

Deletes the KV cache entries for the tenant's domain. The next request will re-resolve from the DB and re-populate the cache. Use if a tenant's domain changes.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `No tenant found for www.la-cafe.co.uk` | `customDomainStatus` not `active` in DB | Run **Fix Domain DNS** from superadmin |
| Azure 404 on custom domain | Worker not deployed | Deploy worker: `cd worker && npm run deploy` |
| SSL pending indefinitely | Nameservers not propagated / TXT records missing | Check TXT records exist in tenant zone; re-run Fix Domain DNS |
| Custom Hostname stuck `pending_validation_txt` | Ownership TXT missing | Run Fix Domain DNS to re-write TXT records |
| Worker returns cached wrong tenant | KV has stale entry | Run **Purge Domain Cache** from superadmin |
| `origin` DNS record can't be deleted | It's the CF fallback origin | Leave it — it's a safety net, never hit when Worker is running |

---

## Environment Variables

```env
# Cloudflare
CLOUDFLARE_API_KEY=            # API token with Zone DNS Edit + Custom Hostnames
CLOUDFLARE_ZONE_ID=            # servisite.co.uk zone ID
CLOUDFLARE_ACCOUNT_ID=         # CF account ID
CLOUDFLARE_KV_DOMAIN_CACHE_ID= # KV namespace ID for Worker domain cache
CLOUDFLARE_FALLBACK_ORIGIN=origin.servisite.co.uk

# Base domain
SERVISITE_BASE_DOMAIN=servisite.co.uk
```

**Cloudflare API token permissions required:**
- Zone → Zone → Read
- Zone → DNS → Edit
- Zone → SSL and Certificates → Edit
- Zone → Custom Hostnames → Edit
- Zone Resources → Include All Zones
