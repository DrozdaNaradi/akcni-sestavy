-- Spusť v Supabase: SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS sestavy (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nazev       text NOT NULL DEFAULT 'Nová sestava',
    aktivni     boolean DEFAULT true,
    akcni_cena  numeric(10,2) DEFAULT 0,   -- bez DPH (hlavní)
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS produkty_sestavy (
    id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sestava_id       uuid REFERENCES sestavy(id) ON DELETE CASCADE NOT NULL,
    artiklove_cislo  text NOT NULL,
    nazev            text NOT NULL,
    foto_url         text DEFAULT '',
    cena_bez_dph     numeric(10,2) DEFAULT 0,
    cena_s_dph       numeric(10,2) DEFAULT 0,
    odkaz_eshop      text DEFAULT '',
    poradi           bigint DEFAULT 0,
    created_at       timestamptz DEFAULT now()
);

ALTER TABLE sestavy ENABLE ROW LEVEL SECURITY;
ALTER TABLE produkty_sestavy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all sestavy"  ON sestavy          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public all produkty" ON produkty_sestavy FOR ALL USING (true) WITH CHECK (true);
