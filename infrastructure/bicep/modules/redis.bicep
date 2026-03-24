// Azure Cache for Redis — private endpoint, TLS only

param prefix string
param location string
param subnetId string
param vnetId string

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: '${prefix}-redis'
  location: location
  properties: {
    sku: {
      name: 'Basic'   // Change to Standard for HA replica
      family: 'C'
      capacity: 1     // 1 GB
    }
    enableNonSslPort: false        // TLS only
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Disabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

resource redisPe 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: '${prefix}-redis-pe'
  location: location
  properties: {
    subnet: { id: subnetId }
    privateLinkServiceConnections: [
      {
        name: '${prefix}-redis-plsc'
        properties: {
          privateLinkServiceId: redis.id
          groupIds: ['redisCache']
        }
      }
    ]
  }
}

resource redisDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.redis.cache.windows.net'
  location: 'global'
}

resource redisDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: redisDnsZone
  name: '${prefix}-redis-dns-link'
  location: 'global'
  properties: {
    virtualNetwork: { id: vnetId }
    registrationEnabled: false
  }
}

resource redisDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-09-01' = {
  parent: redisPe
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: { privateDnsZoneId: redisDnsZone.id }
      }
    ]
  }
}

output hostName string = redis.properties.hostName
output primaryKey string = redis.listKeys().primaryKey
output sslPort int = redis.properties.sslPort
