// Azure Front Door (Standard) — Media CDN for serving blobs via edge cache
// Wraps the storage account blob endpoint with CDN caching rules for images and videos.

param prefix string
param location string  // must be 'global'
param blobEndpoint string  // e.g. https://servisiteprodmedia.blob.core.windows.net

var storageName = split(split(blobEndpoint, 'https://')[1], '.blob')[0]

resource mediaCdn 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: '${prefix}-media'
  location: location
  sku: { name: 'Standard_AzureFrontDoor' }
}

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: mediaCdn
  name: '${prefix}-media'
  location: location
  properties: {
    enabledState: 'Enabled'
  }
}

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: mediaCdn
  name: 'default-origin-group'
  properties: {
    loadBalancingSettings: {
      sampleSize: 4
      successfulSamplesRequired: 3
      additionalLatencyInMilliseconds: 50
    }
    healthProbeSettings: {
      probePath: '/'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 60
    }
  }
}

resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: originGroup
  name: 'blob-storage'
  properties: {
    hostName: '${storageName}.blob.core.windows.net'
    httpPort: 80
    httpsPort: 443
    originHostHeader: '${storageName}.blob.core.windows.net'
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// ── Caching Rule Set ──────────────────────────────────────────────────────────

resource mediaCachingRuleSet 'Microsoft.Cdn/profiles/ruleSets@2023-05-01' = {
  parent: mediaCdn
  name: 'MediaCaching'
}

// Cache video files for 24 hours at edge
resource cacheVideosRule 'Microsoft.Cdn/profiles/ruleSets/rules@2023-05-01' = {
  parent: mediaCachingRuleSet
  name: 'CacheVideos'
  properties: {
    order: 1
    matchProcessingBehavior: 'Continue'
    conditions: [
      {
        name: 'RequestFileExtension'
        parameters: {
          typeName: 'DeliveryRuleRequestFileExtensionMatchConditionParameters'
          operator: 'Equal'
          negateCondition: false
          matchValues: ['mp4', 'webm', 'mov']
          transforms: ['Lowercase']
        }
      }
    ]
    actions: [
      {
        name: 'RouteConfigurationOverride'
        parameters: {
          typeName: 'DeliveryRuleRouteConfigurationOverrideActionParameters'
          cacheConfiguration: {
            queryStringCachingBehavior: 'IgnoreQueryString'
            cacheBehavior: 'OverrideAlways'
            cacheDuration: '23:59:59'
          }
        }
      }
    ]
  }
}

// Cache image files for 24 hours at edge
resource cacheImagesRule 'Microsoft.Cdn/profiles/ruleSets/rules@2023-05-01' = {
  parent: mediaCachingRuleSet
  name: 'CacheImages'
  properties: {
    order: 2
    matchProcessingBehavior: 'Continue'
    conditions: [
      {
        name: 'RequestFileExtension'
        parameters: {
          typeName: 'DeliveryRuleRequestFileExtensionMatchConditionParameters'
          operator: 'Equal'
          negateCondition: false
          matchValues: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
          transforms: ['Lowercase']
        }
      }
    ]
    actions: [
      {
        name: 'RouteConfigurationOverride'
        parameters: {
          typeName: 'DeliveryRuleRouteConfigurationOverrideActionParameters'
          cacheConfiguration: {
            queryStringCachingBehavior: 'IgnoreQueryString'
            cacheBehavior: 'OverrideAlways'
            cacheDuration: '23:59:59'
          }
        }
      }
    ]
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'default-route'
  dependsOn: [origin]
  properties: {
    originGroup: { id: originGroup.id }
    ruleSets: [{ id: mediaCachingRuleSet.id }]
    supportedProtocols: ['Http', 'Https']
    patternsToMatch: ['/*']
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    cacheConfiguration: {
      queryStringCachingBehavior: 'IgnoreQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'image/svg+xml'
          'image/jpeg'
          'image/png'
          'image/webp'
        ]
      }
    }
  }
}

output cdnEndpoint string = 'https://${endpoint.properties.hostName}'
