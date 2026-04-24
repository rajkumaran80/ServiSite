-- CreateEnum
CREATE TYPE "ServiceProfile" AS ENUM ('FOOD_SERVICE', 'GENERAL_SERVICE');

-- CreateEnum
CREATE TYPE "NavLinkType" AS ENUM ('INTERNAL_FEATURE', 'CUSTOM_PAGE', 'EXTERNAL_URL');

-- AlterTable
ALTER TABLE "navigation_items" ADD COLUMN     "featureKey" TEXT,
ADD COLUMN     "isSystemReserved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkType" "NavLinkType" NOT NULL DEFAULT 'EXTERNAL_URL',
ADD COLUMN     "pageId" TEXT,
ADD COLUMN     "parentId" TEXT,
ALTER COLUMN "href" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "serviceProfile" "ServiceProfile" NOT NULL DEFAULT 'FOOD_SERVICE';

-- CreateIndex
CREATE INDEX "navigation_items_tenantId_parentId_idx" ON "navigation_items"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "navigation_items_pageId_idx" ON "navigation_items"("pageId");

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "navigation_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: set GENERAL_SERVICE for non-food tenant types
UPDATE "tenants"
SET "serviceProfile" = 'GENERAL_SERVICE'
WHERE "type" NOT IN ('RESTAURANT', 'CAFE');

-- Data migration: seed Home nav item for every tenant that doesn't already have one
INSERT INTO "navigation_items" ("id", "tenantId", "label", "linkType", "featureKey", "isSystemReserved", "sortOrder", "isActive", "openInNewTab", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'Home',
  'INTERNAL_FEATURE',
  'home',
  true,
  0,
  true,
  false,
  NOW(),
  NOW()
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "navigation_items" ni
  WHERE ni."tenantId" = t.id AND ni."featureKey" = 'home'
);

-- Data migration: seed Contact nav item for every tenant that doesn't already have one
INSERT INTO "navigation_items" ("id", "tenantId", "label", "linkType", "featureKey", "isSystemReserved", "sortOrder", "isActive", "openInNewTab", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t.id,
  'Contact',
  'INTERNAL_FEATURE',
  'contact',
  true,
  999,
  true,
  false,
  NOW(),
  NOW()
FROM "tenants" t
WHERE NOT EXISTS (
  SELECT 1 FROM "navigation_items" ni
  WHERE ni."tenantId" = t.id AND ni."featureKey" = 'contact'
);
