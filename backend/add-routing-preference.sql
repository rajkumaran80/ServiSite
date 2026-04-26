-- Safe migration: Add routingPreference column to tenants table
-- This only ADDS a column, no data will be lost

ALTER TABLE tenants 
ADD COLUMN routingPreference VARCHAR(20) DEFAULT 'direct';

-- Update existing tenants as needed
-- UPDATE tenants SET routingPreference = 'frontdoor' WHERE slug = 'servisite';
