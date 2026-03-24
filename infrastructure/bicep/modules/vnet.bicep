// Virtual Network + Subnets
// All private network isolation lives here.

param prefix string
param location string

resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: '${prefix}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    subnets: [
      {
        // Frontend App Service VNet Integration outbound traffic
        name: 'snet-frontend'
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations: [
            {
              name: 'appservice'
              properties: { serviceName: 'Microsoft.Web/serverFarms' }
            }
          ]
          serviceEndpoints: []
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        // Backend App Service VNet Integration + Private Endpoint
        name: 'snet-backend'
        properties: {
          addressPrefix: '10.0.2.0/24'
          delegations: [
            {
              name: 'appservice'
              properties: { serviceName: 'Microsoft.Web/serverFarms' }
            }
          ]
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        // PostgreSQL, Redis, Storage Private Endpoints
        name: 'snet-data'
        properties: {
          addressPrefix: '10.0.3.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        // Key Vault Private Endpoint
        name: 'snet-keyvault'
        properties: {
          addressPrefix: '10.0.4.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output vnetName string = vnet.name
output subnetFrontendId string = vnet.properties.subnets[0].id
output subnetBackendId string = vnet.properties.subnets[1].id
output subnetDataId string = vnet.properties.subnets[2].id
output subnetKeyvaultId string = vnet.properties.subnets[3].id
