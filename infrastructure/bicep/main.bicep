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

@description('Stripe secret key (sk_live_...)')
@secure()
param stripeSecretKey string

@description('Stripe webhook signing secret (whsec_...)')
@secure()
param stripeWebhookSecret string

@description('SMTP password for email sending')
@secure()
param smtpPassword string

@description('VAPID private key for Web Push notifications')
@secure()
param vapidPrivateKey string

@description('Twilio auth token for WhatsApp notifications')
@secure()
param twilioAuthToken string = ''

@description('Google OAuth client ID')
@secure()
param googleClientId string

@description('VAPID public key (safe to expose — used by frontend push subscription)')
param vapidPublicKey string

@description('SMTP host (e.g. smtp.sendgrid.net)')
param smtpHost string

@description('SMTP port (default 587)')
param smtpPort string = '587'

@description('SMTP TLS (true for port 465, false for 587)')
param smtpSecure string = 'false'

@description('SMTP username / API key username')
param smtpUser string

@description('From address for system emails')
param emailFromAddress string = 'noreply@servisite.co.uk'

@description('From name for system emails')
param emailFromName string = 'ServiSite'

@description('VAPID subject (mailto: or URL)')
param vapidSubject string = 'mailto:admin@servisite.co.uk'

@description('Twilio Account SID')
param twilioAccountSid string = ''

@description('Twilio WhatsApp sender number')
param twilioWhatsappFrom string = 'whatsapp:+14155238886'

@description('Email address for superadmin platform alerts')
param superadminAlertEmail string = 'admin@servisite.co.uk'

@description('Azure Front Door CDN URL for media delivery (e.g. https://servisitemedia-xxxx.azurefd.net)')
param mediaCdnUrl string = ''

@description('Google Places API key — for fetching Google Reviews on tenant home pages')
@secure()
param googlePlacesApiKey string

@description('Azure Container Registry login server (e.g. servisite.azurecr.io)')
param acrLoginServer string

@description('Azure Container Registry name (e.g. servisite)')
param acrName string

@description('Front Door profile unique ID — sent in X-Azure-FDID header (az afd profile show --query frontDoorId)')
param frontDoorId string

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
    stripeSecretKey: stripeSecretKey
    stripeWebhookSecret: stripeWebhookSecret
    smtpPassword: smtpPassword
    vapidPrivateKey: vapidPrivateKey
    twilioAuthToken: twilioAuthToken
    googleClientId: googleClientId
    googlePlacesApiKey: googlePlacesApiKey
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
    frontDoorId: frontDoorId
    backendImageTag: backendImageTag
    frontendImageTag: frontendImageTag
    databaseUrl: 'postgresql://servisite:${dbPassword}@${database.outputs.fqdn}:5432/servisite?sslmode=require'
    redisUrl: 'rediss://:${redis.outputs.primaryKey}@${redis.outputs.hostName}:6380'
    storageAccountName: storage.outputs.accountName
    keyVaultUri: keyvault.outputs.uri
    appDomain: appDomain
    smtpHost: smtpHost
    smtpPort: smtpPort
    smtpSecure: smtpSecure
    smtpUser: smtpUser
    emailFromAddress: emailFromAddress
    emailFromName: emailFromName
    vapidPublicKey: vapidPublicKey
    vapidSubject: vapidSubject
    twilioAccountSid: twilioAccountSid
    twilioWhatsappFrom: twilioWhatsappFrom
    superadminAlertEmail: superadminAlertEmail
    mediaCdnUrl: mediaCdnUrl
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
