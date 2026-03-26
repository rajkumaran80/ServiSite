-- CreateTable
CREATE TABLE "page_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "page_entries" ADD CONSTRAINT "page_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "page_entries_tenantId_pageKey_idx" ON "page_entries"("tenantId", "pageKey");
