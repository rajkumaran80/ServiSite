// App Service Plan + Backend + Frontend App Services
// Backend: NO public access — private endpoint only
// Frontend: locked to Front Door IPs only

param prefix string
param location string
param subnetFrontendId string
param subnetBackendId string
param acrLoginServer string
param acrName string
param backendImageTag string
param frontendImageTag string
param databaseUrl string
param redisUrl string
param storageAccountName string
param keyVaultUri string
param appDomain string

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
        { name: 'NODE_ENV', value: 'production' }
        { name: 'PORT', value: '3001' }
        { name: 'API_PREFIX', value: 'api/v1' }
        { name: 'APP_DOMAIN', value: appDomain }
        { name: 'DATABASE_URL', value: databaseUrl }
        { name: 'REDIS_URL', value: redisUrl }
        { name: 'AZURE_STORAGE_CONTAINER_NAME', value: 'servisite-media' }
        { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storageAccountName }
        { name: 'FRONTEND_URL', value: 'https://${appDomain}' }
        { name: 'ALLOWED_ORIGINS', value: 'https://${appDomain},https://www.${appDomain}' }
        // Secrets via Key Vault references — no plaintext values in config
        { name: 'JWT_SECRET', value: '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '/')[2]};SecretName=jwt-secret)' }
        { name: 'REVALIDATE_SECRET', value: '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '/')[2]};SecretName=revalidate-secret)' }
        { name: 'INTERNAL_SECRET', value: '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '/')[2]};SecretName=internal-secret)' }
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
            'X-Azure-FDID': [ '${prefix}-fd' ]  // Validate our specific FD instance
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
        { name: 'INTERNAL_SECRET', value: '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '/')[2]};SecretName=internal-secret)' }
        { name: 'REVALIDATE_SECRET', value: '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '/')[2]};SecretName=revalidate-secret)' }
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
