-- Create DNS records table for storing all DNS-related information
CREATE TABLE "DnsRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "hostname" TEXT NOT NULL,
  "recordType" TEXT NOT NULL, -- A, AAAA, CNAME, TXT, MX, etc.
  "name" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "ttl" INTEGER NOT NULL DEFAULT 300,
  "priority" INTEGER, -- For MX records
  "status" TEXT NOT NULL DEFAULT 'pending', -- pending, active, error, deleted
  "provider" TEXT NOT NULL DEFAULT 'cloudflare', -- cloudflare, route53, etc.
  "providerRecordId" TEXT, -- ID from external DNS provider
  "isOwnershipVerification" BOOLEAN NOT NULL DEFAULT false,
  "isSSLValidation" BOOLEAN NOT NULL DEFAULT false,
  "isSystemManaged" BOOLEAN NOT NULL DEFAULT false, -- Managed by our system
  "verifiedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DnsRecord_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX "DnsRecord_tenantId_idx" ON "DnsRecord"("tenantId");
CREATE INDEX "DnsRecord_hostname_idx" ON "DnsRecord"("hostname");
CREATE INDEX "DnsRecord_status_idx" ON "DnsRecord"("status");
CREATE INDEX "DnsRecord_provider_idx" ON "DnsRecord"("provider");

-- Add foreign key constraint to Tenant table
ALTER TABLE "DnsRecord" ADD CONSTRAINT "DnsRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create DNS zone configuration table
CREATE TABLE "DnsZone" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "zoneName" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'cloudflare',
  "providerZoneId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "nameservers" TEXT[],
  "originUrl" TEXT, -- Where traffic should be routed
  "customDomainStatus" TEXT NOT NULL DEFAULT 'pending',
  "sslStatus" TEXT NOT NULL DEFAULT 'pending',
  "ownershipStatus" TEXT NOT NULL DEFAULT 'pending',
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DnsZone_pkey" PRIMARY KEY ("id")
);

-- Create indexes for DNS zone table
CREATE INDEX "DnsZone_tenantId_idx" ON "DnsZone"("tenantId");
CREATE INDEX "DnsZone_zoneName_idx" ON "DnsZone"("zoneName");

-- Add foreign key constraint to Tenant table
ALTER TABLE "DnsZone" ADD CONSTRAINT "DnsZone_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint for tenant-zone combination
CREATE UNIQUE INDEX "DnsZone_tenantId_zoneName_key" ON "DnsZone"("tenantId", "zoneName");
