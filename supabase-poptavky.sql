create table poptavky (
  id uuid primary key default gen_random_uuid(),
  sestava_id text,
  sestava_nazev text,
  jmeno text not null,
  email text not null,
  telefon text not null,
  zpusob_doruceni text not null default 'vyzvednutí',
  status text not null default 'nová',
  created_at timestamptz default now()
);

alter table poptavky enable row level security;
create policy "public insert" on poptavky for insert to anon with check (true);
create policy "public select" on poptavky for select to anon using (true);
create policy "public update" on poptavky for update to anon using (true) with check (true);
