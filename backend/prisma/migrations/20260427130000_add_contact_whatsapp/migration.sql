-- AlterTable: add whatsapp field to contact_info (was added via db push without a migration)
ALTER TABLE "contact_info" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
