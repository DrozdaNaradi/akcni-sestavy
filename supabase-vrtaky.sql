-- ============================================================
-- VRTÁKY (ceník v tabulkách) — nový režim stránky
-- Spusť v Supabase: SQL Editor → New query → paste → Run
-- ============================================================

-- Oddíl / set = jedna tabulka (např. "Vrtáky SDS+") s jednou fotkou
CREATE TABLE IF NOT EXISTS vrtaky_kategorie (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nazev       text NOT NULL DEFAULT 'Nová kategorie',
    popis       text DEFAULT '',
    foto_url    text DEFAULT '',
    aktivni     boolean DEFAULT true,
    poradi      bigint DEFAULT 0,
    created_at  timestamptz DEFAULT now()
);

-- Řádek tabulky = jeden průměr / artikl
CREATE TABLE IF NOT EXISTS vrtaky_polozky (
    id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    kategorie_id  uuid REFERENCES vrtaky_kategorie(id) ON DELETE CASCADE NOT NULL,
    artikl        text NOT NULL DEFAULT '',
    nazev         text NOT NULL DEFAULT '',        -- např. "6 mm"
    cena_bez_dph  numeric(10,2) DEFAULT 0,          -- ceníková bez DPH
    sleva_pct     numeric(5,2) DEFAULT 0,           -- procentuální sleva
    poradi        bigint DEFAULT 0,
    created_at    timestamptz DEFAULT now()
    -- cena po slevě = cena_bez_dph * (1 - sleva_pct/100) — počítáno v aplikaci
);

CREATE INDEX IF NOT EXISTS idx_vrtaky_polozky_kat ON vrtaky_polozky(kategorie_id);

ALTER TABLE vrtaky_kategorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE vrtaky_polozky   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public all vrtaky_kat" ON vrtaky_kategorie;
DROP POLICY IF EXISTS "public all vrtaky_pol" ON vrtaky_polozky;
CREATE POLICY "public all vrtaky_kat" ON vrtaky_kategorie FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all vrtaky_pol" ON vrtaky_polozky   FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Přepínač režimu stránky: 'sestavy' (stávající) nebo 'vrtaky'
-- ============================================================
ALTER TABLE page_settings ADD COLUMN IF NOT EXISTS aktivni_rezim text NOT NULL DEFAULT 'sestavy';

-- Volitelné samostatné texty pro režim vrtáků (fallback na stávající)
ALTER TABLE page_settings ADD COLUMN IF NOT EXISTS vrtaky_h1 text DEFAULT 'Vrtáky';
ALTER TABLE page_settings ADD COLUMN IF NOT EXISTS vrtaky_subtitle text DEFAULT 'Vyberte průměry a počty kusů, odešlete poptávku.';

-- ============================================================
-- Poptávky: rozšíření pro vrtákový košík
-- ============================================================
ALTER TABLE poptavky ADD COLUMN IF NOT EXISTS typ text NOT NULL DEFAULT 'sestava';   -- 'sestava' | 'vrtaky'
ALTER TABLE poptavky ADD COLUMN IF NOT EXISTS polozky_json jsonb;                      -- košík vrtáků
