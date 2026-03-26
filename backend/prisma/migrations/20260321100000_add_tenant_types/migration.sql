-- Add new tenant type values to the TenantType enum
ALTER TYPE "TenantType" ADD VALUE IF NOT EXISTS 'CAFE';
ALTER TYPE "TenantType" ADD VALUE IF NOT EXISTS 'BARBER_SHOP';
ALTER TYPE "TenantType" ADD VALUE IF NOT EXISTS 'GYM';
