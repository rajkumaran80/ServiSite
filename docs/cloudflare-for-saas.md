# Cloudflare for SaaS — Architecture Notes

> For the full operational guide including DNS records, Worker setup, and troubleshooting, see [custom-domain-setup.md](custom-domain-setup.md).

---

## Why Cloudflare for SaaS

ServiSite uses **Cloudflare for SaaS (Custom Hostnames)** rather than managing SSL certificates or DNS routing ourselves. When a tenant adds `la-cafe.co.uk`:

- Cloudflare issues a free SSL certificate for the domain automatically via TXT DCV
- No certificate management, renewal, or wildcard complexity
- Scales to any number of tenant custom domains with no code changes

---

## How the SSL Validation Works

### www hostname (`www.la-cafe.co.uk`)
Cloudflare can follow the CNAME chain: `www.la-cafe.co.uk` → `lacafe.servisite.co.uk` → resolves to servisite.co.uk zone → validates ownership. DCV TXT record is still written as a belt-and-braces measure.

### apex hostname (`la-cafe.co.uk`)
A proxied apex CNAME is opaque — Cloudflare cannot follow it for validation. Two TXT records are required:
- `_acme-challenge.la-cafe.co.uk` — DCV token (for SSL cert issuance)
- `_cf-custom-hostname.la-cafe.co.uk` — Ownership pre-validation token

The backend writes both to the tenant's Cloudflare zone after creating the Custom Hostname. **Important:** the ownership token is NOT in the POST response — you must GET the Custom Hostname after creation to retrieve it.

---

## Why the Worker is Necessary

`custom_origin_sni_hostname` (the CF field that sets the Host header to the origin) only works when a `custom_origin_server` is explicitly set on the Custom Hostname. When using the fallback origin (no custom origin server), CF preserves the original Host header — so Azure Front Door receives `Host: www.la-cafe.co.uk` and returns 404.

The Worker solves this by intercepting the request at the edge, resolving the tenant slug, and re-fetching using `lacafe.servisite.co.uk` as the hostname — so Azure receives the correct Host header it knows about.

---

## Custom Hostname Lifecycle

```
POST /zones/{servisite-zone}/custom_hostnames
  → hostname: www.la-cafe.co.uk
  → ssl.method: txt
  ↓
GET /zones/{servisite-zone}/custom_hostnames?hostname=www.la-cafe.co.uk
  → ownership_verification.name  (write as TXT to tenant zone)
  → ownership_verification.value
  → ssl.txt_name                 (write as TXT to tenant zone)
  → ssl.txt_value
  ↓
Status: pending_validation_txt
  → CF checks TXT records exist
  ↓
Status: active (ssl.status = active)
  → Domain is live, backend marks customDomainStatus = 'active'
```

---

## Fallback Origin

`origin.servisite.co.uk` is configured as the CF for SaaS fallback origin. It's a CNAME pointing to `servisite-prod-frontend.azurewebsites.net` (the Azure App Service directly, proxied).

Under normal operation this is **never reached** — the Worker intercepts all Custom Hostname traffic first. It exists as a safety net if the Worker is disabled or errors.

The `origin` DNS record cannot be deleted while it's set as the fallback origin in CF. Leave it in place.
