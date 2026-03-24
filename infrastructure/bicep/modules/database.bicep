// PostgreSQL Flexible Server — private endpoint only, no public access

param prefix string
param location string
param subnetId string

@secure()
param dbPassword string

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: '${prefix}-postgres'
  location: location
  sku: {
    name: 'Standard_B2ms'   // 2 vCPUs, 8 GB — scale up when needed
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'servisite'
    administratorLoginPassword: dbPassword
    version: '16'
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'   // Enable for production HA
    }
    highAvailability: {
      mode: 'Disabled'   // Enable ZoneRedundant for HA
    }
    network: {
      // Private access — no public connectivity
      delegatedSubnetResourceId: subnetId
      privateDnsZoneArmResourceId: postgresDnsZone.id
    }
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgres
  name: 'servisite'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Firewall: require SSL on all connections
resource requireSsl 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-06-01-preview' = {
  parent: postgres
  name: 'require_secure_transport'
  properties: {
    value: 'ON'
    source: 'user-override'
  }
}

resource postgresDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: '${prefix}-postgres.private.postgres.database.azure.com'
  location: 'global'
}

output fqdn string = postgres.properties.fullyQualifiedDomainName
output serverName string = postgres.name
