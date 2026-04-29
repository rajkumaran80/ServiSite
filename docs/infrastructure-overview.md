# ServiSite Infrastructure Overview

## The Big Picture

```
User Browser
     │
     ▼
Azure Front Door (WAF)          ← single entry point, servisite.co.uk
     │
     ▼
Frontend App Service            ← Next.js, private VNet
     │
     ▼
Backend App Service             ← NestJS, no public internet access
     │
     ├── PostgreSQL             ← database
     ├── Redis                  ← cache
     ├── Blob Storage           ← images
     └── Key Vault              ← secrets
```

---

## Azure Components

### Resource Group: `servisite-rg`
A folder in Azure that holds everything. Billing, permissions, and deletion all happen at this level. Delete the resource group = delete everything.

---

### Azure Container Registry: `servisite.azurecr.io`
A private Docker image store — like Docker Hub but yours only. GitHub Actions builds your code into a Docker image and pushes it here. App Services pull from here to run your app.

---

### Virtual Network (VNet): `servisite-prod-vnet` `10.0.0.0/16`
A private network inside Azure. Nothing inside it is reachable from the internet unless you explicitly allow it. Think of it as your own office network in the cloud.

It has 5 **subnets** (sections of the network):

| Subnet | CIDR | What lives here |
|--------|------|-----------------|
| `snet-frontend` | `10.0.1.0/24` | Frontend App Service outbound traffic |
| `snet-backend` | `10.0.2.0/24` | Backend App Service outbound traffic |
| `snet-data` | `10.0.3.0/24` | Redis + Storage private endpoints |
| `snet-keyvault` | `10.0.4.0/24` | Key Vault private endpoint |
| `snet-postgres` | `10.0.5.0/24` | PostgreSQL (dedicated — Azure requirement) |

---

### App Service Plan: `servisite-prod-plan`
The server that runs both your apps. Like renting a VM. P1v3 tier (1 vCPU, 1.75GB RAM). Both frontend and backend share this plan.

---

### Backend App Service: `servisite-prod-backend`
Runs your NestJS Docker container. Key properties:
- **No public internet access** — completely blocked. Only reachable from inside the VNet
- Connected to `snet-backend` so it can talk to Postgres, Redis, Storage, Key Vault
- Reads secrets from Key Vault automatically via Managed Identity (no passwords in config)
- Has a **staging slot** for zero-downtime deploys

---

### Frontend App Service: `servisite-prod-frontend`
Runs your Next.js Docker container. Key properties:
- **Only Azure Front Door can reach it** — direct browser access is blocked
- Talks to the backend over the private VNet (not the public internet)
- Has a **staging slot** for zero-downtime deploys

---

### PostgreSQL Flexible Server: `servisite-prod-postgres`
Your database. Key properties:
- Lives entirely inside `snet-postgres` — no public IP
- Only the backend can connect to it (same VNet)
- SSL required on all connections
- Auto-growing storage, 7-day backups
- Has a **private DNS zone** so the backend finds it by name:
  `servisite-prod-postgres.private.postgres.database.azure.com`

---

### Azure Cache for Redis: `servisite-prod-redis`
Used by `TenantCacheService`. Stores tenant data so the backend doesn't hit the database on every request. Key properties:
- Private endpoint in `snet-data` — no public access
- TLS only
- Connected via private DNS

---

### Blob Storage: `servisite-prod-storage`
Stores uploaded images (menu photos, gallery, logos). Key properties:
- Private endpoint in `snet-data`
- Backend accesses it via **Managed Identity** — no connection string with passwords
- Container: `servisite-media`

---

### Key Vault: `servisteprodkv`
Stores all secrets. Key properties:
- Private endpoint in `snet-keyvault` — no public access whatsoever
- Holds: `db-password`, `jwt-secret`, `revalidate-secret`, `internal-secret`
- App Services read secrets via **Key Vault references** — Azure injects them as env vars
  automatically. Your app never handles secret management directly.

---

### Azure Front Door Premium: `servisite-prod-fd`
The public entry point for all traffic. Key properties:
- **WAF (Web Application Firewall)** — blocks SQL injection, XSS, bad bots (OWASP 3.2 ruleset)
- **DDoS protection** built in
- **SSL termination** — handles HTTPS for `servisite.co.uk`, `www.servisite.co.uk`, `*.servisite.co.uk`
- **CDN** — caches static assets globally
- Routes all traffic: `servisite.co.uk/*` → Frontend App Service

---

## GitHub Components

### Repository Secrets (Settings → Secrets → Actions)

| Secret | What it is | Used by |
|--------|-----------|---------|
| `AZURE_CLIENT_ID` | Identity of the GitHub Actions "user" in Azure | Both workflows |
| `AZURE_TENANT_ID` | Your Azure directory ID | Both workflows |
| `AZURE_SUBSCRIPTION_ID` | Your Azure account ID | Both workflows |

### OIDC / Workload Identity Federation
Instead of storing long-lived Azure passwords in GitHub, Azure trusts GitHub's identity token
directly. GitHub proves "I am a workflow running from `rajkumaran80/ServiSite` on `main` branch"
and Azure accepts it. No credentials to rotate or leak.

- **App Registration**: `servisite-github-actions` (ID: `4fb4af1d-cbda-4c89-9943-80f6682b0062`)
- **Federated credential subject**: `repo:rajkumaran80/ServiSite:ref:refs/heads/main`

---

## GitHub Actions Workflows

### Deploy Backend (`.github/workflows/backend.yml`)
Triggers on push to `main` when `backend/` files change:

```
1. Checkout code
2. Login to Azure (OIDC — no password)
3. Login to ACR (servisite.azurecr.io)
4. Build Docker image from backend/Dockerfile
5. Push image tagged with commit SHA + latest
6. Update staging slot to use the new image
7. Wait 30s (container starts → prisma migrate deploy → app starts)
8. Swap staging → production (zero downtime)
```

### Deploy Frontend (`.github/workflows/frontend.yml`)
Same flow for `frontend/` changes, targeting `servisite-prod-frontend`.

---

## How a User Request Flows

```
1. User visits costa.servisite.co.uk

2. DNS (Cloudflare) resolves to Azure Front Door

3. Front Door
   - WAF inspects the request (blocks if malicious)
   - SSL terminates here (HTTPS)
   - Routes to Frontend App Service

4. Frontend (Next.js)
   - Server-renders the page
   - Calls backend API over private VNet:
     http://servisite-prod-backend:3001/api/v1/...
   - Reads tenant data → checks Redis cache first
   - Cache miss → queries PostgreSQL → stores result in Redis

5. Response travels back:
   PostgreSQL → Backend → Frontend → Front Door → User
```

---

## How a Deploy Flows

```
1. You push code to main on GitHub

2. GitHub Actions workflow starts automatically

3. Builds Docker image (your app + all dependencies)

4. Pushes image to ACR (private registry in Azure)

5. Updates STAGING slot to use the new image
   - Container starts
   - prisma migrate deploy runs (DB schema updated safely)
   - NestJS / Next.js starts up
   - Health check passes

6. Swap staging → production
   - Zero downtime — Azure switches traffic instantly
   - Old container stays on standby briefly then shuts down
```

---

## DNS Setup (Cloudflare — servisite.co.uk zone)

DNS is managed in **Cloudflare**, not IONOS. The servisite.co.uk zone is fully hosted on Cloudflare.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `servisite.co.uk` (apex) | `servisite-prod-endpoint-afdnhugfdxaqfpec.z03.azurefd.net` | Proxied |
| CNAME | `www` | `servisite.co.uk` | Proxied |
| CNAME | `*` | `servisite.co.uk` | Proxied — routes all tenant subdomains to Azure FD |
| CNAME | `media` | `servisiteprodmedia.blob.core.windows.net` | Proxied |
| CNAME | `origin` | `servisite-prod-frontend.azurewebsites.net` | Proxied — CF for SaaS fallback origin only |

Get the Front Door hostname:
```bash
az afd endpoint show \
  --resource-group servisite-rg \
  --profile-name servisite-prod-fd \
  --endpoint-name servisite-prod-endpoint \
  --query hostName -o tsv
# → servisite-prod-endpoint-afdnhugfdxaqfpec.z03.azurefd.net
```

For custom domain (tenant-owned) DNS setup, see [custom-domain-setup.md](custom-domain-setup.md).

---

## Bicep Deploy Command

```bash
cd infrastructure/bicep

az deployment group create \
  --resource-group servisite-rg \
  --template-file main.bicep \
  --parameters @parameters.json \
  --parameters \
    dbPassword='...' \
    jwtSecret='...' \
    revalidateSecret='...' \
    internalSecret='...'
```

Secrets are stored in Key Vault during this deploy and never need to be passed again.
