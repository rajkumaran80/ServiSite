// App Service Plan + Backend + Frontend App Services
// Backend: NO public access — private endpoint only
// Frontend: locked to Front Door IPs only

param prefix string
param location string
param subnetFrontendId string
param subnetBackendId string
param acrLoginServer string
param acrName string
param frontDoorId string
param backendImageTag string
param frontendImageTag string
param databaseUrl string
param redisUrl string
param storageAccountName string
param keyVaultUri string
param appDomain string

// ── Non-secret config params ───────────────────────────────────────────────────
param smtpHost string
param smtpPort string = '587'
param smtpSecure string = 'false'
param smtpUser string
param emailFromAddress string
param emailFromName string = 'ServiSite'
param vapidPublicKey string
param vapidSubject string
param twilioAccountSid string
param twilioWhatsappFrom string = 'whatsapp:+14155238886'
param superadminAlertEmail string

// Helper: extract Key Vault name from URI (e.g. https://servisiteprodkv.vault.azure.net/)
var kvName = split(split(keyVaultUri, '/')[2], '.')[0]

// ── App Service Plan (shared by both apps) ────────────────────────────────────

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${prefix}-plan'
  location: location
  kind: 'linux'
  sku: {
    name: 'P1v3'   // 1 vCPU, 1.75 GB — scales to P2v3/P3v3 as needed
    tier: 'PremiumV3'
  }
  properties: {
    reserved: true  // Required for Linux
  }
}

// ── Backend App Service ───────────────────────────────────────────────────────

resource backend 'Microsoft.Web/sites@2023-01-01' = {
  name: '${prefix}-backend'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    vnetRouteAllEnabled: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/servisite-backend:${backendImageTag}'
      acrUseManagedIdentityCreds: true
      http20Enabled: true
      minTlsVersion: '1.2'
      // Block ALL public traffic — only accessible via private endpoint from VNet
      ipSecurityRestrictions: [
        {
          action: 'Deny'
          priority: 100
          name: 'deny-all-public'
          ipAddress: '0.0.0.0/0'
        }
      ]
      ipSecurityRestrictionsDefaultAction: 'Deny'
      appSettings: [
        // ── App ──────────────────────────────────────────────────────────────
        { name: 'NODE_ENV', value: 'production' }
        { name: 'PORT', value: '3001' }
        { name: 'API_PREFIX', value: 'api/v1' }
        { name: 'APP_DOMAIN', value: appDomain }
        { name: 'APP_URL', value: 'https://${appDomain}' }
        { name: 'FRONTEND_URL', value: 'https://${appDomain}' }
        { name: 'ALLOWED_ORIGINS', value: 'https://${appDomain},https://www.${appDomain}' }
        // ── Data ─────────────────────────────────────────────────────────────
        { name: 'DATABASE_URL', value: databaseUrl }
        { name: 'REDIS_URL', value: redisUrl }
        // ── Azure Storage ─────────────────────────────────────────────────────
        { name: 'AZURE_STORAGE_CONTAINER_NAME', value: 'servisite-media' }
        { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storageAccountName }
        { name: 'AZURE_STORAGE_SAS_EXPIRY_HOURS', value: '24' }
        // ── JWT ───────────────────────────────────────────────────────────────
        { name: 'JWT_ACCESS_EXPIRY', value: '15m' }
        { name: 'JWT_REFRESH_EXPIRY', value: '7d' }
        // ── Email (SMTP) ──────────────────────────────────────────────────────
        { name: 'SMTP_HOST', value: smtpHost }
        { name: 'SMTP_PORT', value: smtpPort }
        { name: 'SMTP_SECURE', value: smtpSecure }
        { name: 'SMTP_USER', value: smtpUser }
        { name: 'EMAIL_FROM_ADDRESS', value: emailFromAddress }
        { name: 'EMAIL_FROM_NAME', value: emailFromName }
        // ── Web Push (VAPID) ──────────────────────────────────────────────────
        { name: 'VAPID_PUBLIC_KEY', value: vapidPublicKey }
        { name: 'VAPID_SUBJECT', value: vapidSubject }
        // ── Twilio WhatsApp ───────────────────────────────────────────────────
        { name: 'TWILIO_ACCOUNT_SID', value: twilioAccountSid }
        { name: 'TWILIO_WHATSAPP_FROM', value: twilioWhatsappFrom }
        // ── Alerts ───────────────────────────────────────────────────────────
        { name: 'SUPERADMIN_ALERT_EMAIL', value: superadminAlertEmail }
        // ── Cloudflare for SaaS ───────────────────────────────────────────────
        { name: 'CLOUDFLARE_API_KEY',  value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=cloudflare-api-key)' }
        { name: 'CLOUDFLARE_ZONE_ID',  value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=cloudflare-zone-id)' }
        // ── Secrets via Key Vault (no plaintext) ──────────────────────────────
        { name: 'JWT_SECRET',              value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=jwt-secret)' }
        { name: 'REVALIDATE_SECRET',       value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=revalidate-secret)' }
        { name: 'INTERNAL_SECRET',         value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=internal-secret)' }
        { name: 'STRIPE_SECRET_KEY',       value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=stripe-secret-key)' }
        { name: 'STRIPE_WEBHOOK_SECRET',   value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=stripe-webhook-secret)' }
        { name: 'SMTP_PASS',               value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=smtp-password)' }
        { name: 'VAPID_PRIVATE_KEY',       value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=vapid-private-key)' }
        { name: 'TWILIO_AUTH_TOKEN',       value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=twilio-auth-token)' }
        { name: 'GOOGLE_CLIENT_ID',        value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=google-client-id)' }
        { name: 'GOOGLE_PLACES_API_KEY',   value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=google-places-api-key)' }
        // ── Container ─────────────────────────────────────────────────────────
        { name: 'WEBSITES_PORT', value: '3001' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acrLoginServer}' }
      ]
    }
  }
}

// VNet Integration — backend can reach data layer (Postgres, Redis, Storage)
resource backendVnetIntegration 'Microsoft.Web/sites/networkConfig@2023-01-01' = {
  parent: backend
  name: 'virtualNetwork'
  properties: {
    subnetResourceId: subnetBackendId
    swiftSupported: true
  }
}

// ── Frontend App Service ──────────────────────────────────────────────────────

resource frontend 'Microsoft.Web/sites@2023-01-01' = {
  name: '${prefix}-frontend'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    vnetRouteAllEnabled: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/servisite-frontend:${frontendImageTag}'
      acrUseManagedIdentityCreds: true
      http20Enabled: true
      minTlsVersion: '1.2'
      // Only Azure Front Door IPs can reach the frontend directly
      ipSecurityRestrictions: [
        {
          action: 'Allow'
          priority: 100
          name: 'allow-front-door'
          tag: 'ServiceTag'
          ipAddress: 'AzureFrontDoor.Backend'
          headers: {
            'X-Azure-FDID': [ frontDoorId ]
          }
        }
        {
          action: 'Deny'
          priority: 200
          name: 'deny-all'
          ipAddress: '0.0.0.0/0'
        }
      ]
      ipSecurityRestrictionsDefaultAction: 'Deny'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'NEXT_PUBLIC_APP_DOMAIN', value: appDomain }
        { name: 'NEXT_PUBLIC_API_URL', value: 'http://${prefix}-backend:3001/api/v1' }  // Private VNet hostname
        // NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY are
        // baked into the Docker image as build args in frontend.yml — not set here.
        { name: 'REVALIDATE_SECRET',     value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=revalidate-secret)' }
        { name: 'INTERNAL_SECRET',       value: '@Microsoft.KeyVault(VaultName=${kvName};SecretName=internal-secret)' }
        { name: 'WEBSITES_PORT', value: '3000' }
        { name: 'DOCKER_REGISTRY_SERVER_URL', value: 'https://${acrLoginServer}' }
      ]
    }
  }
}

// VNet Integration — frontend reaches backend over private network
resource frontendVnetIntegration 'Microsoft.Web/sites/networkConfig@2023-01-01' = {
  parent: frontend
  name: 'virtualNetwork'
  properties: {
    subnetResourceId: subnetFrontendId
    swiftSupported: true
  }
}

// ── ACR reference (created before Bicep deploy) ───────────────────────────────

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

// ── RBAC: Managed Identities ──────────────────────────────────────────────────

// AcrPull — App Services pull their container images using managed identity
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
resource backendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(backend.id, acr.id, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: backend.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource frontendAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(frontend.id, acr.id, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: frontend.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Blob Data Contributor — backend can read/write blobs without a connection string
var storageBlobContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
resource backendStorageRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(backend.id, storageAccountName, storageBlobContributorRoleId)
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobContributorRoleId)
    principalId: backend.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Key Vault Secrets User — read secrets from Key Vault
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'
resource backendKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(backend.id, keyVaultUri, kvSecretsUserRoleId)
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: backend.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource frontendKvRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(frontend.id, keyVaultUri, kvSecretsUserRoleId)
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
    principalId: frontend.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output backendAppName string = backend.name
output frontendAppName string = frontend.name
output backendDefaultHostname string = backend.properties.defaultHostName
output frontendDefaultHostname string = frontend.properties.defaultHostName
output backendPrincipalId string = backend.identity.principalId
output frontendPrincipalId string = frontend.identity.principalId
