-- ============================================================
-- VRTÁKY — rozměrové sloupce (pro auto-import z ceníku)
-- Ø průměr × pracovní délka × celková délka
-- Spusť v Supabase: SQL Editor → New query → paste → Run
-- ============================================================
ALTER TABLE vrtaky_polozky ADD COLUMN IF NOT EXISTS prumer      numeric(7,2);  -- Ø v mm
ALTER TABLE vrtaky_polozky ADD COLUMN IF NOT EXISTS delka_prac  numeric(7,1);  -- pracovní délka v mm
ALTER TABLE vrtaky_polozky ADD COLUMN IF NOT EXISTS delka_celk  numeric(7,1);  -- celková délka v mm
