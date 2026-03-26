-- Rename table menu_sections -> menu_groups
ALTER TABLE "menu_sections" RENAME TO "menu_groups";

-- Rename the foreign key column on categories
ALTER TABLE "categories" RENAME COLUMN "menuSectionId" TO "menuGroupId";

-- Rename constraints and indexes to keep them consistent
ALTER INDEX IF EXISTS "menu_sections_pkey" RENAME TO "menu_groups_pkey";

-- Drop old FK constraint and recreate pointing to renamed table
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_menuSectionId_fkey";
ALTER TABLE "categories" ADD CONSTRAINT "categories_menuGroupId_fkey"
  FOREIGN KEY ("menuGroupId") REFERENCES "menu_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename the FK constraint on menu_groups itself
ALTER TABLE "menu_groups" DROP CONSTRAINT IF EXISTS "menu_sections_tenantId_fkey";
ALTER TABLE "menu_groups" ADD CONSTRAINT "menu_groups_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
