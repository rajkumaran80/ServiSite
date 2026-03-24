# ServiSite — Security Architecture

> Domain: servisite.co.uk
> Resource Group: servisite-rg
> Azure Region: uksouth
> Last updated: 2026-03-22

---

## Core Principle

**The backend never touches the public internet.**
Only the frontend talks to it, over a private Azure network.
Everything public goes through one hardened entry point (Azure Front Door).

---

## Architecture Overview

```
Internet
   │
   ▼
Azure Front Door Premium  (servisite.co.uk, *.servisite.co.uk, www.servisite.co.uk)
  ├─ WAF — OWASP 3.2 + Bot Manager (Prevention mode)
  ├─ DDoS Standard
  ├─ Rate limit: 300 req/min per IP
  ├─ SSL auto-managed certificates (TLS 1.2 minimum)
  └─ CDN / ISR cache
   │
   ▼
Frontend App Service  (servisite-prod-frontend.azurewebsites.net)
  - IP restriction: AzureFrontDoor.Backend service tag ONLY
  - Direct .azurewebsites.net URL → Denied
  - VNet Integration → snet-frontend (10.0.1.0/24)
   │
   │  Private VNet (10.0.0.0/16)
   ▼
Backend App Service  (NO public hostname — private endpoint only)
  - Public network access: DISABLED
  - Reachable only from snet-frontend via private endpoint
  - X-Internal-Secret header enforced in production
   │
   ├──────────────────────────────────┐
   ▼                                  ▼
PostgreSQL Flexible Server        Azure Cache for Redis
Private Endpoint (snet-data)      Private Endpoint (snet-data)
10.0.3.x                          10.0.3.x

Azure Blob Storage                Azure Key Vault
Private Endpoint (snet-data)      Private Endpoint (snet-keyvault)
Managed Identity access           Managed Identity access
No connection strings             No access keys

Azure Container Registry
Admin disabled
Managed Identity pull (App Services)
OIDC push (GitHub Actions)
```

---

## Layer 1 — Network Isolation (Azure VNet)

### VNet: `servisite-prod-vnet`
**Address space:** `10.0.0.0/16`  **Region:** uksouth

| Subnet | Name | CIDR | Purpose |
|--------|------|------|---------|
| `snet-frontend` | Frontend outbound | `10.0.1.0/24` | Frontend App Service VNet Integration |
| `snet-backend` | Backend | `10.0.2.0/24` | Backend App Service VNet Integration + Private Endpoint |
| `snet-data` | Data layer | `10.0.3.0/24` | PostgreSQL, Redis, Storage Private Endpoints |
| `snet-keyvault` | Key Vault | `10.0.4.0/24` | Key Vault Private Endpoint |

### Private DNS Zones (auto-created by Bicep)
| Zone | Resource |
|------|----------|
| `privatelink.vaultcore.azure.net` | Key Vault |
| `privatelink.blob.core.windows.net` | Storage |
| `privatelink.redis.cache.windows.net` | Redis |
| `servisite-prod-postgres.private.postgres.database.azure.com` | PostgreSQL |

---

## Layer 2 — Edge Security (Azure Front Door Premium)

| Feature | Config |
|---------|--------|
| Profile | `servisite-prod-fd` |
| SKU | Premium (required for private link + bot protection) |
| WAF policy | `servisteprodwaf` — Prevention mode |
| OWASP rules | Microsoft_DefaultRuleSet 2.1 — SQLi, XSS, LFI, RCE, PHP injection |
| Bot protection | Microsoft_BotManagerRuleSet 1.0 |
| Rate limit | 300 req/min per IP (WAF custom rule) |
| SSL | Auto-managed certificates — Azure renews automatically |
| TLS minimum | 1.2 |
| Custom domains | `servisite.co.uk`, `www.servisite.co.uk`, `*.servisite.co.uk` |
| HTTPS redirect | Enabled — all HTTP → HTTPS |
| Compression | Enabled for HTML, CSS, JS, JSON, SVG |

### App Service IP Lockdown
- **Frontend**: Only `AzureFrontDoor.Backend` service tag allowed + Front Door ID header validated
- **Backend**: `0.0.0.0/0` → Deny. No public IP whatsoever.

---

## Layer 3 — Application Security

### NestJS Backend

| Control | Detail |
|---------|--------|
| `helmet` | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, HSTS (production only) |
| `@nestjs/throttler` | Global: 100 req/min. Auth endpoints: 5 req/min (brute force protection) |
| CORS | Restricted to `servisite.co.uk` and `*.servisite.co.uk` only |
| `X-Internal-Secret` | Middleware rejects requests missing the header in production |
| Validation | Global `ValidationPipe` — whitelist, forbid extra props, transform enabled |
| Auth | JWT — access token 15 min, refresh 7 days |
| Swagger | Disabled in `NODE_ENV=production` |
| Non-root container | Runs as `nestjs` user (uid 1001) |

### Next.js Frontend

| Control | Detail |
|---------|--------|
| Security headers | `next.config.mjs` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Cache-Control | Per-route: no-cache on `/dashboard`, `/auth`; CDN-cacheable on tenant pages |
| ISR revalidation | `REVALIDATE_SECRET` — validates backend calls to `/api/revalidate` |
| `X-Internal-Secret` | Sent on every Axios request to backend |
| Non-root container | Runs as `nextjs` user (uid 1001) |

### X-Internal-Secret Flow
```
Frontend Axios request
  → adds header: X-Internal-Secret: <shared secret>
  → Backend InternalSecretMiddleware validates it
  → Mismatch → 403 Forbidden (logged with requester IP)
  → Development: check skipped automatically
```

---

## Layer 4 — Secrets Management (Azure Key Vault)

**Key Vault name:** `servisteprodkv` (auto-truncated to 24 chars)
**Access:** Private Endpoint only, RBAC enabled, Managed Identity

| Secret name (Key Vault) | What it holds | Used by |
|------------------------|---------------|---------|
| `jwt-secret` | JWT signing key | Backend |
| `revalidate-secret` | ISR shared secret | Backend + Frontend |
| `internal-secret` | Internal auth header | Backend + Frontend |
| `db-password` | PostgreSQL password | Backend + Bicep deploy |

### App Service Config (Key Vault References)
Secrets are referenced in App Service config as:
```
@Microsoft.KeyVault(VaultName=servisteprodkv;SecretName=jwt-secret)
```
No plaintext secrets ever appear in App Service environment variables or deployment logs.

### Azure Storage — Managed Identity
Backend Managed Identity has `Storage Blob Data Contributor` role.
No `AZURE_STORAGE_CONNECTION_STRING` in production config.

---

## Layer 5 — CI/CD Security (GitHub Actions + OIDC)

### How OIDC works
```
GitHub Actions run starts
  → GitHub mints a short-lived OIDC token (expires with the job)
  → azure/login@v2 exchanges it for an Azure access token
  → That token has only the permissions assigned to the App Registration
  → Job ends → token expires → nothing to rotate or leak
```

### GitHub Secrets required
| Secret | Value | Notes |
|--------|-------|-------|
| `AZURE_CLIENT_ID` | App Registration client ID | From OIDC setup |
| `AZURE_TENANT_ID` | Azure AD tenant ID | Your tenant |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID | Default subscription |
| `ACR_LOGIN_SERVER` | `servisite.azurecr.io` | Your ACR |
| `AZURE_BACKEND_APP_NAME` | `servisite-prod-backend` | App Service name |
| `AZURE_FRONTEND_APP_NAME` | `servisite-prod-frontend` | App Service name |

**No** `ACR_USERNAME`, `ACR_PASSWORD`, publish profiles, or service principal secrets needed.

### Setting up OIDC (one-time, ~5 minutes)
```bash
# 1. Create App Registration
az ad app create --display-name "servisite-github-actions"

# 2. Create Service Principal
az ad sp create --id <app-id-from-above>

# 3. Add federated credential (main branch)
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<your-github-username>/ServiSite:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 4. Assign roles
az role assignment create \
  --assignee <app-id> \
  --role "Contributor" \
  --scope /subscriptions/<subscription-id>/resourceGroups/servisite-rg

az role assignment create \
  --assignee <app-id> \
  --role "AcrPush" \
  --scope /subscriptions/<subscription-id>/resourceGroups/servisite-rg/providers/Microsoft.ContainerRegistry/registries/servisite

# 5. Add the three IDs as GitHub Secrets:
#    AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID
```

---

## Layer 6 — Data Security

| Resource | Encryption | Backup | Access |
|----------|-----------|--------|--------|
| PostgreSQL 16 | AES-256 at rest | 7-day automated | Private endpoint, SSL required |
| Redis | AES-256 at rest | — | Private endpoint, TLS 1.2 only, no non-SSL port |
| Blob Storage | AES-256 at rest | 7-day soft delete | Private endpoint, Managed Identity |
| Key Vault | AES-256 at rest | Soft delete 30 days, purge protected | Private endpoint, Managed Identity |

---

## DNS Configuration (IONOS)

### Records to add in IONOS control panel for `servisite.co.uk`

After deploying Bicep, Azure will give you a Front Door hostname like `servisite-prod-endpoint-xxxx.z01.azurefd.net`.
Replace `<fd-hostname>` with that value below.

| Type | Host / Name | Value | TTL |
|------|------------|-------|-----|
| `ALIAS` | `@` (root) | `<fd-hostname>.azurefd.net` | 300 |
| `CNAME` | `www` | `<fd-hostname>.azurefd.net` | 300 |
| `CNAME` | `*` | `<fd-hostname>.azurefd.net` | 300 |
| `TXT` | `@` | Azure domain verification token (from portal) | 300 |
| `TXT` | `_dmarc` | `v=DMARC1; p=reject; rua=mailto:admin@servisite.co.uk` | 300 |

> **IONOS ALIAS note:** IONOS calls this record type `ALIAS` in the DNS management panel. Use it for the root `@` record — this avoids the "can't CNAME on apex" DNS limitation without needing Cloudflare.

> **`api.servisite.co.uk` does NOT exist in DNS.** The backend has no public URL. Frontend reaches it via the private VNet using the internal Azure hostname.

### Tenant Custom Domains
When a tenant (e.g. `pizzapalace.com`) adds their domain via the dashboard:
1. They add `CNAME www → servisite.co.uk` in their registrar
2. App generates a TXT verification token via Settings → Domain
3. They add `TXT _servisite-verify.pizzapalace.com → <token>`
4. App verifies via DNS lookup → sets `customDomainStatus = active`
5. Azure Front Door is updated to accept the custom domain (manual step for now — automate later via ARM API)

---

## Bicep Deployment (when ready)

### File structure
```
infrastructure/bicep/
├── main.bicep              ← Entry point
├── parameters.json         ← Non-secret parameters
└── modules/
    ├── vnet.bicep          ← Virtual network + subnets
    ├── keyvault.bicep      ← Key Vault + secrets + private endpoint
    ├── database.bicep      ← PostgreSQL Flexible Server
    ├── redis.bicep         ← Azure Cache for Redis
    ├── storage.bicep       ← Blob Storage + private endpoint
    ├── appservice.bicep    ← App Service Plan + backend + frontend + RBAC
    └── frontdoor.bicep     ← Front Door Premium + WAF + custom domains
```

### Deploy command
```bash
# Generate secrets first (do this once, store in a password manager)
DB_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)
REVALIDATE_SECRET=$(openssl rand -hex 32)
INTERNAL_SECRET=$(openssl rand -hex 32)

# Deploy
az deployment group create \
  --resource-group servisite-rg \
  --template-file infrastructure/bicep/main.bicep \
  --parameters infrastructure/bicep/parameters.json \
  --parameters \
    dbPassword="$DB_PASS" \
    jwtSecret="$JWT_SECRET" \
    revalidateSecret="$REVALIDATE_SECRET" \
    internalSecret="$INTERNAL_SECRET" \
    acrLoginServer="servisite.azurecr.io"
```

### Post-deploy checklist
- [ ] Validate custom domains in Front Door portal (Azure sends verification email)
- [ ] Add DNS records in IONOS (see table above)
- [ ] Run `prisma migrate deploy` on backend (happens automatically via CI/CD)
- [ ] Test health endpoint: `https://servisite.co.uk/api/v1/health`
- [ ] Verify WAF is in Prevention mode (not Detection)
- [ ] Enable Azure Defender for App Service in Security Center

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Direct backend attack | Backend has no public IP or hostname |
| SQL injection | WAF OWASP rules + Prisma parameterised queries + ValidationPipe whitelist |
| XSS | CSP header (helmet) + React's built-in escaping |
| CSRF | SameSite=Strict on cookies + JWT in Authorization header |
| DDoS | Azure DDoS Standard (Front Door) + WAF rate limiting (300 req/min) |
| Brute force login | Throttler: 5 req/min on all `/auth/*` endpoints |
| Credential theft | No credentials in env vars — Key Vault references only |
| Subdomain takeover | Front Door validates and owns all `*.servisite.co.uk` certs |
| Bot scraping | Front Door Bot Manager (blocks known bad bots) |
| IDOR (cross-tenant data access) | Tenant middleware always scopes DB queries to `tenantId` |
| Supply chain | Dependabot alerts + Microsoft Defender for Containers (ACR scanning) |
| Leaked CI secrets | OIDC — no long-lived secrets in GitHub at all |
| Container escape | Non-root user (`nestjs`/`nextjs`, uid 1001) in both Dockerfiles |
| Man-in-the-middle | HSTS enforced, TLS 1.2 minimum everywhere, HTTPS-only |
| Fake frontend call | `X-Internal-Secret` middleware blocks requests not from frontend |

---

## Local Development

The VNet and private endpoints are Azure-only. Local dev is unchanged:

```bash
# Start Postgres + Redis
docker compose -f infrastructure/docker-compose.dev.yml up -d

# Backend (.env)
NODE_ENV=development
REDIS_URL=redis://localhost:6379
INTERNAL_SECRET=        ← leave blank — check is skipped in dev

# Frontend (.env.local)
NEXT_PUBLIC_APP_DOMAIN=servisite.co.uk
INTERNAL_SECRET=        ← leave blank locally
```

`InternalSecretMiddleware` skips its check when `NODE_ENV !== 'production'` so Swagger, curl, and the local frontend all work without any headers.

---

## Environment Variables Summary

### Backend (production — all via Key Vault references or App Service config)
| Variable | Source | Value |
|----------|--------|-------|
| `NODE_ENV` | App Service | `production` |
| `APP_DOMAIN` | App Service | `servisite.co.uk` |
| `ALLOWED_ORIGINS` | App Service | `https://servisite.co.uk,https://www.servisite.co.uk` |
| `FRONTEND_URL` | App Service | `https://servisite.co.uk` |
| `DATABASE_URL` | App Service | `postgresql://... (private endpoint FQDN)` |
| `REDIS_URL` | App Service | `rediss://... (private endpoint, TLS)` |
| `JWT_SECRET` | Key Vault ref | — |
| `REVALIDATE_SECRET` | Key Vault ref | — |
| `INTERNAL_SECRET` | Key Vault ref | — |

### Frontend (production)
| Variable | Source | Value |
|----------|--------|-------|
| `NEXT_PUBLIC_APP_DOMAIN` | Build arg | `servisite.co.uk` |
| `NEXT_PUBLIC_API_URL` | Build arg | `https://servisite.co.uk/api/v1` |
| `REVALIDATE_SECRET` | Key Vault ref | — |
| `INTERNAL_SECRET` | Key Vault ref | — |

### GitHub Secrets (CI/CD — OIDC only)
| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | OIDC app registration ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `ACR_LOGIN_SERVER` | `servisite.azurecr.io` |
| `AZURE_BACKEND_APP_NAME` | `servisite-prod-backend` |
| `AZURE_FRONTEND_APP_NAME` | `servisite-prod-frontend` |
