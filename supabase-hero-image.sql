-- Přidání sloupce hero_image_url do page_settings
ALTER TABLE page_settings ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
