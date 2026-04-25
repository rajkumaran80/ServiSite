-- DropIndex
DROP INDEX "registration_attempts_createdAt_idx";

-- DropIndex
DROP INDEX "registration_attempts_ip_idx";

-- AlterTable
ALTER TABLE "registration_attempts" ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "dns_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL DEFAULT 300,
    "priority" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'cloudflare',
    "providerRecordId" TEXT,
    "isOwnershipVerification" BOOLEAN NOT NULL DEFAULT false,
    "isSSLValidation" BOOLEAN NOT NULL DEFAULT false,
    "isSystemManaged" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dnsZoneId" TEXT,

    CONSTRAINT "dns_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dns_zones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "zoneName" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'cloudflare',
    "providerZoneId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "nameservers" TEXT[],
    "originUrl" TEXT,
    "customDomainStatus" TEXT NOT NULL DEFAULT 'pending',
    "sslStatus" TEXT NOT NULL DEFAULT 'pending',
    "ownershipStatus" TEXT NOT NULL DEFAULT 'pending',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dns_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dns_records_tenantId_idx" ON "dns_records"("tenantId");

-- CreateIndex
CREATE INDEX "dns_records_hostname_idx" ON "dns_records"("hostname");

-- CreateIndex
CREATE INDEX "dns_records_status_idx" ON "dns_records"("status");

-- CreateIndex
CREATE INDEX "dns_records_provider_idx" ON "dns_records"("provider");

-- CreateIndex
CREATE INDEX "dns_records_dnsZoneId_idx" ON "dns_records"("dnsZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "dns_zones_tenantId_key" ON "dns_zones"("tenantId");

-- CreateIndex
CREATE INDEX "dns_zones_zoneName_idx" ON "dns_zones"("zoneName");

-- AddForeignKey
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_records" ADD CONSTRAINT "dns_records_dnsZoneId_fkey" FOREIGN KEY ("dnsZoneId") REFERENCES "dns_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dns_zones" ADD CONSTRAINT "dns_zones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
