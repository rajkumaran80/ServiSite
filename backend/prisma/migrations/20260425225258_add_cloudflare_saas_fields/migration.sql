-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "lastCloudflareSyncAt" TIMESTAMP(3),
ADD COLUMN     "ownershipVerificationRecords" JSONB,
ADD COLUMN     "ownershipVerificationStatus" TEXT,
ADD COLUMN     "sslValidationRecords" JSONB,
ADD COLUMN     "sslValidationStatus" TEXT;
