# Custom Domain Setup Automation - Implementation Complete

## Overview

Admin users can now set up custom domains with a completely automated backend flow. The admin only needs to enter the domain and update nameservers at their registrar (IONOS, GoDaddy, etc). All other setup is handled automatically by the backend.

## Key Changes

### ✅ Backend (NestJS)

#### 1. **New Azure Front Door Service** (`backend/src/modules/tenant/azure-frontdoor.service.ts`)
Manages Azure Front Door Premium CDN profile custom domain provisioning using the Azure CDN management SDK:
- `createCustomDomain(resourceGroup, profileName, hostname)` - Creates managed-certificate custom domain
- `getCustomDomainStatus(resourceGroup, profileName, hostname)` - Returns validation state (Pending/Approved/Failed/Unknown)
- `deleteCustomDomain(resourceGroup, profileName, hostname)` - Removes custom domain

Uses `@azure/arm-cdn` CdnManagementClient with DefaultAzureCredential for authentication.

#### 2. **Refactored TenantService** (`backend/src/modules/tenant/tenant.service.ts`)

**setCustomDomain(tenantId, domain)** - New automated flow:
```
1. Create Cloudflare DNS zone → receive nameservers
2. Setup DNS records in zone:
   - CNAME www → Azure Front Door hostname
   - A record @ → 192.0.2.1 (Cloudflare placeholder for redirect)
   - Redirect apex → www  
3. Add Azure App Service hostname bindings (www + apex)
4. Create Azure Front Door custom domains (www + apex)
5. Store Cloudflare zoneId + nameservers in database
6. Return nameservers array to frontend
```
Returns: `{ nameservers: string[], message: string }`

**verifyCustomDomain(tenantId)** - Multi-check verification:
```
1. Check Cloudflare zone activation status (via checkZoneActive)
2. Check Azure Front Door domain validation status (via getCustomDomainStatus)
3. Only mark as 'active' when both systems report ready
4. Populate domain→slug cache mappings
```
Returns: `{ verified: boolean, message: string }`

**removeCustomDomain(tenantId)** - Complete cleanup:
```
1. Delete Cloudflare DNS zone (includes all DNS records)
2. Remove Azure App Service hostname bindings  
3. Delete Azure Front Door custom domains
4. Clear domain field in database
```

#### 3. **Updated CloudflareService** (`backend/src/modules/tenant/cloudflare.service.ts`)
Modified `setupZoneDnsRecords(zoneId, domain, azureFrontDoorHostname)`:
- Now accepts Azure Front Door hostname as parameter
- CNAME www record points to provided hostname instead of hardcoded value
- Supports both old (custom hostnames) and new (DNS zones) flows

#### 4. **Updated TenantModule** (`backend/src/modules/tenant/tenant.module.ts`)
- Added `AzureFrontDoorService` to providers
- Module now injects 3 cloud services: Cloudflare, Azure App Service, Azure Front Door

### ✅ Frontend (Next.js)

#### Dashboard Settings UI (`frontend/app/dashboard/settings/page.tsx`)

**Updated Domain Section:**
- Replaced `domainCname` state with `domainNameservers: string[]`
- Updated data loading to populate nameservers from tenant entity
- Updated form handlers to work with new response format

**New UI Flow:**
When domain status is 'pending':
```
[Nameserver Instructions Block]
- Shows Cloudflare nameservers with copy buttons
- Includes step-by-step example for IONOS:
  1. Log in to IONOS
  2. Go to Domain Management → Your Domain → Nameservers
  3. Replace existing nameservers with the ones shown
  4. Save changes (10–60 minute propagation)
- Shows "Check Status" button to verify when ready

[Active Domain Block]
- Once verified, displays green success message
- Shows active domain name
```

## Admin User Experience

### Step 1: Add Custom Domain
```
Admin enters: "pizzapalace.com" → clicks "Save Domain"
Backend returns: Nameservers (e.g., ryleigh.ns.cloudflare.com, odin.ns.cloudflare.com)
UI shows: Copy-friendly nameserver list + IONOS setup instructions
```

### Step 2: Update Registrar
```
Admin goes to IONOS/GoDaddy/NameCheap
Changes nameservers to Cloudflare nameservers provided by UI
Waits 10–60 minutes for propagation
```

### Step 3: Verify Domain
```
Admin returns to dashboard → clicks "Check Status"
Backend checks:
  - Cloudflare zone is active (nameservers pointing correctly)
  - Azure Front Door domains are validated (SSL ready)
If both ready: Domain marked as 'active'
Admin sees: ✓ Your custom domain is active!
```

### Step 4: Domain Ready
```
Domain is now fully active and serving traffic via:
- Cloudflare DNS (provides DNS routing, caching, security)
- Azure Front Door (CDN, WAF, SSL termination)
- Azure App Service (application hosting)
```

## Architecture

```
                    IONOS/GoDaddy/NameCheap
                           |
                  (Admin changes nameservers)
                           |
                           v
                    Cloudflare Nameservers
                    (ryleigh, odin, etc)
                           |
                    DNS Zone for Domain
                    (setup by backend)
                           |
         +---------+---------+---------+
         |         |         |         |
         v         v         v         v
       www   apex→www     origins/   redirect
      (CNAME)  (A+rule)  servisite  (rule)
         |         |                 |
         +----+----+----------+------+
              |               |
              v               v
         Azure Front Door  Cloudflare
         CDN Profile       Redirect
         (custom domains)  Rules
              |
              v
         Azure App Service
         (backend hosting)
```

## Database Changes

Tenant model fields:
- `customDomainZoneId` - Cloudflare DNS zone ID (new approach)
- `customDomainNsRecords` - Array of Cloudflare nameservers to add at registrar
- `customDomainStatus` - 'pending' | 'active' | 'failed' (existing)
- Legacy fields preserved for backward compatibility:
  - `customDomainToken` - Custom hostname ID (old approach)
  - `customDomainApexToken` - Custom hostname apex ID (old approach)  
  - `customDomainTxtName` - SSL validation TXT name (old approach)
  - `customDomainTxtValue` - SSL validation TXT value (old approach)

## Environment Configuration

Add to `.env` or deployment secrets:

```env
# Azure Front Door CDN integration
AZURE_RESOURCE_GROUP=servisite-prod-rg
AZURE_FRONTDOOR_PROFILE_NAME=servisite-prod-fd  
AZURE_FRONTDOOR_HOSTNAME=servisite-prod-fd.azurefd.net

# Existing Cloudflare config (update existing)
CLOUDFLARE_API_KEY=your-api-token
CLOUDFLARE_ZONE_ID=your-zone-id
```

Note: Azure authentication uses DefaultAzureCredential, which works with:
- Managed Identities (on Azure infrastructure)
- Environment variables (local dev or CI/CD)
- Interactive login (local dev)

## Backwards Compatibility

The implementation maintains support for existing domains using the old custom hostname flow:
- Existing code paths still functional
- Legacy fields preserved in database
- TenantService logic handles both flows based on presence of `customDomainZoneId`
- No migration required for existing customers

## Error Handling

- Comprehensive error logging in all service methods
- Graceful degradation if one step fails (e.g., if App Service binding fails, domain setup doesn't block)
- User-friendly error messages in frontend
- Status API endpoints allow debugging domain setup issues

## Testing Checklist

When deploying/testing:
- [ ] Environment variables set: AZURE_RESOURCE_GROUP, AZURE_FRONTDOOR_PROFILE_NAME, AZURE_FRONTDOOR_HOSTNAME
- [ ] Cloudflare API token has permissions: Zone SSL/Certificates Edit, Zone Read, Zone Settings Read
- [ ] Azure credentials configured (app must authenticate to Azure CDN API)
- [ ] Test domain setup workflow end-to-end
- [ ] Test nameserver verification (zone activation check)
- [ ] Test Azure Front Door domain validation status checks
- [ ] Test domain removal cleans up all resources
- [ ] Verify legacy domain flow still works for existing tenants

## Technical Debt / Future Improvements

- [ ] Add domain setup webhook for async monitoring of zone activation
- [ ] Implement exponential backoff for domain verification polls
- [ ] Add admin dashboard metrics for domain setup success rates
- [ ] Support multiple Azure Front Door profiles for multi-region setup
- [ ] Automated nameserver validation before returning to admin
- [ ] Email notifications when domain becomes active

## Files Modified

**Backend:**
- `backend/src/modules/tenant/tenant.service.ts` - Complete refactor of setCustomDomain, verifyCustomDomain, removeCustomDomain
- `backend/src/modules/tenant/cloudflare.service.ts` - Updated setupZoneDnsRecords signature
- `backend/src/modules/tenant/tenant.module.ts` - Added AzureFrontDoorService provider
- `backend/src/modules/tenant/azure-frontdoor.service.ts` - NEW: Complete implementation

**Frontend:**
- `frontend/app/dashboard/settings/page.tsx` - Updated domain UI section, replaced CNAME instructions with nameserver instructions

**Configuration:**
- `backend/.env.example` - Added AZURE_RESOURCE_GROUP, AZURE_FRONTDOOR_PROFILE_NAME, AZURE_FRONTDOOR_HOSTNAME

**SDK Dependencies (already installed):**
- `@azure/arm-cdn@^9.1.0` - Azure CDN Management library (for Front Door custom domains)
- `@azure/arm-frontdoor@^5.3.0` - Azure Front Door library (installed but not currently used)
