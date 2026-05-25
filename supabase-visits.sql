-- Spusť v Supabase: SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS page_visits (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    visited_at  timestamptz DEFAULT now()
);

ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert visits" ON page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "public select visits" ON page_visits FOR SELECT USING (true);
