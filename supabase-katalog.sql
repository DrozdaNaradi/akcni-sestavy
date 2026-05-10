-- Katalog produktů z e-shopu (imp01–imp07)
CREATE TABLE IF NOT EXISTS produkty_katalog (
  kod_vyrobku      TEXT PRIMARY KEY,
  nazev            TEXT,
  popis            TEXT,          -- Popis vyrobku (HTML)
  cena_s_dph       NUMERIC,       -- Nase cena s DPH
  cena_bez_dph     NUMERIC,       -- Nase cena bez DPH (/ 1.21)
  rrp_s_dph        NUMERIC,       -- Cena pred slevou s DPH
  rrp_bez_dph      NUMERIC,       -- Cena pred slevou bez DPH
  obrazek_url      TEXT,
  eshop_url        TEXT,
  ean              TEXT,
  imp_soubor       TEXT,
  aktualizovano    TIMESTAMPTZ DEFAULT NOW()
);

-- Přidat sloupec popis pokud tabulka již existuje
ALTER TABLE produkty_katalog ADD COLUMN IF NOT EXISTS popis TEXT;

-- Metadata importu
CREATE TABLE IF NOT EXISTS katalog_meta (
  id               INT PRIMARY KEY DEFAULT 1,
  last_import      TIMESTAMPTZ,
  pocet_produktu   INT
);

-- RLS
ALTER TABLE produkty_katalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON produkty_katalog;
CREATE POLICY "allow_all" ON produkty_katalog USING (true) WITH CHECK (true);

ALTER TABLE katalog_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all" ON katalog_meta;
CREATE POLICY "allow_all" ON katalog_meta USING (true) WITH CHECK (true);
