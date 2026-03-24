// Azure Key Vault — all secrets stored here, accessed via Managed Identity
// No credentials in App Service environment variables.

param prefix string
param location string
param subnetId string
param vnetId string

@secure()
param dbPassword string
@secure()
param jwtSecret string
@secure()
param revalidateSecret string
@secure()
param internalSecret string

var kvName = replace('${prefix}-kv', '-', '')  // Key Vault names: alphanumeric only, max 24 chars

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: take(kvName, 24)
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    // Managed Identity access only — no access policies needed for users in normal operation
    enableRbacAuthorization: true
    // Private endpoint only — disable public access
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'None'
      ipRules: []
      virtualNetworkRules: []
    }
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
    enablePurgeProtection: true
  }
}

// ── Secrets ───────────────────────────────────────────────────────────────────

resource secretDbPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'db-password'
  properties: { value: dbPassword }
}

resource secretJwt 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'jwt-secret'
  properties: { value: jwtSecret }
}

resource secretRevalidate 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'revalidate-secret'
  properties: { value: revalidateSecret }
}

resource secretInternal 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'internal-secret'
  properties: { value: internalSecret }
}

// ── Private Endpoint ──────────────────────────────────────────────────────────

resource kvPe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: '${prefix}-kv-pe'
  location: location
  properties: {
    subnet: { id: subnetId }
    privateLinkServiceConnections: [
      {
        name: '${prefix}-kv-plsc'
        properties: {
          privateLinkServiceId: kv.id
          groupIds: ['vault']
        }
      }
    ]
  }
}

resource kvDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
}

resource kvDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: kvDnsZone
  name: '${prefix}-kv-dns-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

resource kvDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  parent: kvPe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: { privateDnsZoneId: kvDnsZone.id }
      }
    ]
  }
}

output name string = kv.name
output uri string = kv.properties.vaultUri
output id string = kv.id
