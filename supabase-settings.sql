-- Page settings table (singleton row, id=1)
create table if not exists page_settings (
  id   int primary key default 1,
  brand    text not null default 'Drozda Nářadí',
  presents text not null default 'Presents',
  tag      text not null default 'Akční sestavy',
  eyebrow  text not null default 'Milwaukee Tool',
  h1       text not null default 'Akční sestavy',
  subtitle text not null default 'Výhodné sady nářadí za speciální ceny. Platí jen po omezenou dobu.'
);

-- Insert default row if not exists
insert into page_settings (id) values (1) on conflict do nothing;

-- RLS
alter table page_settings enable row level security;

create policy "public select" on page_settings for select using (true);
create policy "public update" on page_settings for update using (true);
create policy "public insert" on page_settings for insert with check (true);
