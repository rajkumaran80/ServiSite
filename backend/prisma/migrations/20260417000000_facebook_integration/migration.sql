-- Add Facebook page integration fields to tenants
ALTER TABLE "tenants"
  ADD COLUMN "facebookPageId"      TEXT,
  ADD COLUMN "facebookPageName"    TEXT,
  ADD COLUMN "facebookAccessToken" TEXT,
  ADD COLUMN "facebookTokenExpiry" TIMESTAMP(3);
