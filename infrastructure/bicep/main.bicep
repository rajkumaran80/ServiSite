// ============================================================
// ServiSite — Azure Infrastructure
// Resource Group: servisite-rg
// Domain: servisite.co.uk
//
// Deploy:
//   az deployment group create \
//     --resource-group servisite-rg \
//     --template-file infrastructure/bicep/main.bicep \
//     --parameters @infrastructure/bicep/parameters.json
// ============================================================

targetScope = 'resourceGroup'

@description('Environment name — used in resource naming')
@allowed(['prod', 'staging'])
param env string = 'prod'

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Postgres admin password — store in Key Vault after first deploy')
@secure()
param dbPassword string

@description('JWT signing secret')
@secure()
param jwtSecret string

@description('ISR revalidation shared secret (backend ↔ frontend)')
@secure()
param revalidateSecret string

@description('Backend ↔ Frontend internal auth secret')
@secure()
param internalSecret string

@description('Azure Container Registry login server (e.g. servisite.azurecr.io)')
param acrLoginServer string

@description('Azure Container Registry name (e.g. servisite)')
param acrName string

@description('Backend Docker image tag')
param backendImageTag string = 'latest'

@description('Frontend Docker image tag')
param frontendImageTag string = 'latest'

// ── Naming ────────────────────────────────────────────────────────────────────
var prefix = 'servisite-${env}'
var appDomain = 'servisite.co.uk'

// ── Modules ───────────────────────────────────────────────────────────────────

module vnet 'modules/vnet.bicep' = {
  name: 'vnet'
  params: {
    prefix: prefix
    location: location
  }
}

module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    prefix: prefix
    location: location
    subnetId: vnet.outputs.subnetKeyvaultId
    vnetId: vnet.outputs.vnetId
    dbPassword: dbPassword
    jwtSecret: jwtSecret
    revalidateSecret: revalidateSecret
    internalSecret: internalSecret
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    prefix: prefix
    location: location
    subnetId: vnet.outputs.subnetDataId
    vnetId: vnet.outputs.vnetId
  }
}

module database 'modules/database.bicep' = {
  name: 'database'
  params: {
    prefix: prefix
    location: location
    subnetId: vnet.outputs.subnetPostgresId
    vnetId: vnet.outputs.vnetId
    dbPassword: dbPassword
  }
}

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: {
    prefix: prefix
    location: location
    subnetId: vnet.outputs.subnetDataId
    vnetId: vnet.outputs.vnetId
  }
}

module appservice 'modules/appservice.bicep' = {
  name: 'appservice'
  params: {
    prefix: prefix
    location: location
    subnetFrontendId: vnet.outputs.subnetFrontendId
    subnetBackendId: vnet.outputs.subnetBackendId
    acrLoginServer: acrLoginServer
    acrName: acrName
    backendImageTag: backendImageTag
    frontendImageTag: frontendImageTag
    databaseUrl: 'postgresql://servisite:${dbPassword}@${database.outputs.fqdn}:5432/servisite?sslmode=require'
    redisUrl: 'rediss://:${redis.outputs.primaryKey}@${redis.outputs.hostName}:6380'
    storageAccountName: storage.outputs.accountName
    keyVaultUri: keyvault.outputs.uri
    appDomain: appDomain
  }
}

module frontdoor 'modules/frontdoor.bicep' = {
  name: 'frontdoor'
  params: {
    prefix: prefix
    location: 'global'
    frontendHostname: appservice.outputs.frontendDefaultHostname
    backendHostname: appservice.outputs.backendDefaultHostname
    appDomain: appDomain
  }
}

// ── Outputs ───────────────────────────────────────────────────────────────────

output frontDoorEndpoint string = frontdoor.outputs.endpoint
output frontendAppName string = appservice.outputs.frontendAppName
output backendAppName string = appservice.outputs.backendAppName
output keyVaultName string = keyvault.outputs.name
