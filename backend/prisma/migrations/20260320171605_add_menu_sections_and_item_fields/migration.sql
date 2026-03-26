-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "menuSectionId" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "allergens" TEXT[],
ADD COLUMN     "isPopular" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "menu_sections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "servedFrom" TEXT,
    "servedUntil" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_sections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "menu_sections" ADD CONSTRAINT "menu_sections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_menuSectionId_fkey" FOREIGN KEY ("menuSectionId") REFERENCES "menu_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
