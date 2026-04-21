# Custom Domain Setup Guide

This guide covers everything needed to connect a tenant's custom domain (e.g. `mycafe.com`) to ServiSite.

---

## Overview

When a tenant saves a custom domain via Settings → Custom Domain, the backend automatically:
1. Registers `www.mycafe.com` and `mycafe.com` as Cloudflare Custom Hostnames (SSL provisioning)
2. Adds Azure App Service hostname bindings for both

The tenant then needs to add DNS records at their registrar and optionally add SSL validation records in Cloudflare.

---

## Step 1 — Registrar DNS Records

Add all 5 records at the tenant's domain registrar (e.g. IONOS, GoDaddy, Namecheap):

| Type | Host | Value | Description |
|------|------|-------|-------------|
| `A` | `@` | `104.21.5.20` | Points root domain (`mycafe.com`) to Cloudflare |
| `A` | `@` | `172.67.132.192` | Second Cloudflare IP for redundancy |
| `CNAME` | `www` | `origin.servisite.co.uk` | Points `www.mycafe.com` to the Azure origin server |
| `TXT` | `asuid` | `921c9222c9c2a858b880fae91c6c5debf8263248bc34267e426f99771a6eab89` | Azure domain ownership proof for root domain |
| `TXT` | `asuid.www` | `921c9222c9c2a858b880fae91c6c5debf8263248bc34267e426f99771a6eab89` | Azure domain ownership proof for www |

> **Note on apex CNAME:** Standard DNS does not allow a CNAME on `@`. Use two A records instead (as above). The A record IPs are Cloudflare's shared IPs for the `servisite.co.uk` zone — traffic routes through Cloudflare to the Azure origin.

> **IONOS specifically:** If IONOS shows a domain forwarding/redirect on `@`, delete it before adding the A records. The redirect causes SSL to break.

---

## Step 2 — Cloudflare SSL Validation Records

After the domain is registered as a Custom Hostname in Cloudflare, check its status in the Cloudflare dashboard:

**Cloudflare Dashboard → servisite.co.uk zone → SSL/TLS → Custom Hostnames**

If the domain shows **Pending Validation (TXT)**, add two more records at the registrar:

| Type | Host | Value | Description |
|------|------|-------|-------------|
| `TXT` | `_acme-challenge` | *(copy from Cloudflare)* | Proves domain ownership to the SSL certificate authority (Google Trust Services) so HTTPS certificate gets issued |
| `TXT` | `_cf-custom-hostname` | *(copy from Cloudflare)* | Proves the tenant authorises this domain to be used on ServiSite's Cloudflare zone |

The values are unique per domain — copy them from the Cloudflare Custom Hostnames table for that specific domain.

Once added, allow **5–10 minutes** for SSL to activate. The Cloudflare status will change from Pending to **Active**.

---

## Step 3 — Verify in Admin

After DNS propagates (usually 10–30 minutes for Step 1, 5–10 minutes for Step 2):

1. Go to Settings → Custom Domain in the tenant dashboard
2. Click **Check Status**
3. If active, the domain will show a green "Active" badge

---

## Adding a Domain Manually (existing tenants / ops)

If a domain was set up before the code supported apex registration, add it manually:

### Cloudflare
1. Cloudflare Dashboard → `servisite.co.uk` → SSL/TLS → Custom Hostnames
2. Click **Add Custom Hostname**
3. Add both `mycafe.com` and `www.mycafe.com` separately
4. Use **Default origin server** (do not override)

### Azure App Service
```bash
az webapp config hostname add \
  --webapp-name servisite-prod-frontend \
  --resource-group servisite-rg \
  --hostname mycafe.com

az webapp config hostname add \
  --webapp-name servisite-prod-frontend \
  --resource-group servisite-rg \
  --hostname www.mycafe.com
```

---

## Architecture Notes

- **`origin.servisite.co.uk`** — a CNAME in Cloudflare's DNS for the `servisite.co.uk` zone pointing to `servisite-prod-frontend.azurewebsites.net`. This is the "real" server behind the proxy.
- **Cloudflare Custom Hostnames** — allow tenant domains to route through ServiSite's Cloudflare zone for SSL termination and proxying, without the tenant needing to move their DNS to Cloudflare.
- **Azure hostname bindings** — required for Azure App Service to accept incoming requests for the tenant domain; without them Azure returns a 404.
- **`asuid` TXT records** — Azure's domain ownership verification. Both `asuid` (apex) and `asuid.www` use the same token for `servisite-prod-frontend`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` | SSL certificate not yet issued | Add `_acme-challenge` and `_cf-custom-hostname` TXT records |
| `ERR_SSL_PROTOCOL_ERROR` | HTTP redirect on apex domain intercepting before SSL | Delete any registrar forwarding/redirect on `@` |
| Cloudflare shows "does not CNAME to this zone" | Normal warning when using A records for apex | Ignore — SSL still works via TXT validation |
| Check Status returns "not yet active" | DNS not propagated yet | Wait 10–30 min and try again |
| Azure returns 404 | Hostname binding missing | Run `az webapp config hostname add` for both apex and www |
