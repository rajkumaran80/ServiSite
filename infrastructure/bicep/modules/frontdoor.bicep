// Azure Front Door Premium — WAF, CDN, SSL termination, custom domains
// Premium tier required for: private link origins, WAF bot protection, custom rules

param prefix string
param location string  // must be 'global'
param frontendHostname string
param backendHostname string  // backend is NOT added as a FD origin — it's private
param appDomain string

resource fd 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: '${prefix}-fd'
  location: location
  sku: { name: 'Premium_AzureFrontDoor' }
}

// ── WAF Policy ────────────────────────────────────────────────────────────────

resource wafPolicy 'Microsoft.Network/FrontDoorWebApplicationFirewallPolicies@2022-05-01' = {
  name: '${replace(prefix, '-', '')}waf'
  location: 'global'
  sku: { name: 'Premium_AzureFrontDoor' }
  properties: {
    policySettings: {
      enabledState: 'Enabled'
      mode: 'Prevention'         // Block mode — change to Detection initially if you want to audit first
      requestBodyCheck: 'Enabled'
    }
    managedRules: {
      managedRuleSets: [
        {
          // OWASP 3.2 — blocks SQLi, XSS, LFI, RFI, RCE, PHP injection, etc.
          ruleSetType: 'Microsoft_DefaultRuleSet'
          ruleSetVersion: '2.1'
          ruleSetAction: 'Block'
        }
        {
          // Bot protection — blocks known bad bots and scanners
          ruleSetType: 'Microsoft_BotManagerRuleSet'
          ruleSetVersion: '1.0'
          ruleSetAction: 'Block'
        }
      ]
    }
    customRules: {
      rules: [
        {
          // IP rate limit: 300 requests per minute per IP
          name: 'RateLimitPerIP'
          enabledState: 'Enabled'
          priority: 10
          ruleType: 'RateLimitRule'
          rateLimitDurationInMinutes: 1
          rateLimitThreshold: 300
          matchConditions: [
            {
              matchVariable: 'RemoteAddr'
              operator: 'IPMatch'
              negateCondition: true
              matchValue: ['0.0.0.0/0']
            }
          ]
          action: 'Block'
        }
      ]
    }
  }
}

// ── Endpoint ──────────────────────────────────────────────────────────────────

resource endpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: fd
  name: '${prefix}-endpoint'
  location: location
  properties: {
    enabledState: 'Enabled'
  }
}

// ── Origin Group (Frontend App Service) ──────────────────────────────────────

resource originGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: fd
  name: 'frontend-origins'
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
      probeIntervalInSeconds: 30
    }
  }
}

resource origin 'Microsoft.Cdn/profiles/originGroups/origins@2023-05-01' = {
  parent: originGroup
  name: 'frontend'
  properties: {
    hostName: frontendHostname
    httpPort: 80
    httpsPort: 443
    originHostHeader: frontendHostname
    priority: 1
    weight: 1000
    enabledState: 'Enabled'
    enforceCertificateNameCheck: true
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

resource route 'Microsoft.Cdn/profiles/afdEndpoints/routes@2023-05-01' = {
  parent: endpoint
  name: 'default-route'
  dependsOn: [origin]
  properties: {
    originGroup: { id: originGroup.id }
    supportedProtocols: ['Http', 'Https']
    patternsToMatch: ['/*']
    forwardingProtocol: 'HttpsOnly'
    linkToDefaultDomain: 'Enabled'
    httpsRedirect: 'Enabled'
    enabledState: 'Enabled'
    // WAF policy attached at route level
    cacheConfiguration: {
      queryStringCachingBehavior: 'UseQueryString'
      compressionSettings: {
        isCompressionEnabled: true
        contentTypesToCompress: [
          'text/html'
          'text/css'
          'application/javascript'
          'application/json'
          'image/svg+xml'
        ]
      }
    }
  }
}

// ── Security Policy (WAF) ─────────────────────────────────────────────────────

resource securityPolicy 'Microsoft.Cdn/profiles/securityPolicies@2023-05-01' = {
  parent: fd
  name: 'waf-policy'
  properties: {
    parameters: {
      type: 'WebApplicationFirewall'
      wafPolicy: { id: wafPolicy.id }
      associations: [
        {
          domains: [
            { id: endpoint.id }
          ]
          patternsToMatch: ['/*']
        }
      ]
    }
  }
}

// ── Custom Domains ────────────────────────────────────────────────────────────
// After deploying, validate these domains in the Azure portal and add DNS records in IONOS

resource customDomainApex 'Microsoft.Cdn/profiles/customDomains@2023-05-01' = {
  parent: fd
  name: replace(appDomain, '.', '-')
  properties: {
    hostName: appDomain
    tlsSettings: {
      certificateType: 'ManagedCertificate'  // Azure auto-provisions and renews SSL
      minimumTlsVersion: 'TLS12'
    }
  }
}

resource customDomainWww 'Microsoft.Cdn/profiles/customDomains@2023-05-01' = {
  parent: fd
  name: 'www-${replace(appDomain, '.', '-')}'
  properties: {
    hostName: 'www.${appDomain}'
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

resource customDomainWildcard 'Microsoft.Cdn/profiles/customDomains@2023-05-01' = {
  parent: fd
  name: 'wildcard-${replace(appDomain, '.', '-')}'
  properties: {
    hostName: '*.${appDomain}'
    tlsSettings: {
      certificateType: 'ManagedCertificate'
      minimumTlsVersion: 'TLS12'
    }
  }
}

output endpoint string = 'https://${endpoint.properties.hostName}'
output frontDoorId string = fd.properties.frontDoorId
output wafPolicyName string = wafPolicy.name
