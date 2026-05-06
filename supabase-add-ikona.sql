-- Add ikona column to sestavy table
alter table sestavy add column if not exists ikona text default '';
