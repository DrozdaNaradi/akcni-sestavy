-- Přidat sloupec pocet_kusu do tabulky produkty_sestavy
ALTER TABLE produkty_sestavy
  ADD COLUMN IF NOT EXISTS pocet_kusu INTEGER NOT NULL DEFAULT 1;
