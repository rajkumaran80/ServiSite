-- AlterTable: add media fields to gallery_images
ALTER TABLE "gallery_images"
  ADD COLUMN "mediaType" TEXT NOT NULL DEFAULT 'image',
  ADD COLUMN "fileSize"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blobName"  TEXT;

-- AlterTable: add storage tracking to tenants
ALTER TABLE "tenants"
  ADD COLUMN "usedStorageBytes" BIGINT NOT NULL DEFAULT 0;
