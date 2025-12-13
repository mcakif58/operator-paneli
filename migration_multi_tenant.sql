-- Migration to Multi-Tenant Architecture (Refined)

-- 1. Create 'sirketler' (Companies) Table
create table if not exists sirketler (
  id uuid default gen_random_uuid() primary key,
  sirket_adi text not null unique,
  vardiya_sistemi jsonb default '[]'::jsonb, -- Example: [{"id": 1, "name": "Vardiya 1", "start": "08:00", "end": "16:00"}]
  telegram_grup_idleri jsonb default '[]'::jsonb, -- Example: [{"purpose": "warning", "id": "-123456789"}]
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add 'sirket_id' to existing tables and FK

-- Machines
-- Ensure sirket_id is added
alter table machines 
  add column if not exists sirket_id uuid references sirketler(id);

-- Operators
alter table operators 
  add column if not exists sirket_id uuid references sirketler(id),
  add column if not exists card_id text; -- RFID Card ID

-- 3. Update Logs and Enforce Strict ID Relations

-- Helper function to safe cast or handle conversion if needed
-- For now assuming data is clean or empty.

-- Sorunsuz Parça Logları
alter table sorunsuz_parca_loglari
  add column if not exists sirket_id uuid references sirketler(id);

-- Convert machine_id to bigint if it's text, and add FK
-- This block attempts to alter the column. If it fails due to dirty data, manual cleanup is needed.
do $$
begin
  -- Check if machine_id is text
  if exists (select 1 from information_schema.columns where table_name='sorunsuz_parca_loglari' and column_name='machine_id' and data_type='text') then
    alter table sorunsuz_parca_loglari 
      alter column machine_id type bigint using machine_id::bigint;
  end if;
end $$;

alter table sorunsuz_parca_loglari 
  drop constraint if exists fk_sorunsuz_parca_machine,
  add constraint fk_sorunsuz_parca_machine foreign key (machine_id) references machines(id);


-- Hata Logları
alter table hata_loglari
  add column if not exists sirket_id uuid references sirketler(id);

do $$
begin
  if exists (select 1 from information_schema.columns where table_name='hata_loglari' and column_name='machine_id' and data_type='text') then
    alter table hata_loglari 
      alter column machine_id type bigint using machine_id::bigint;
  end if;
end $$;

alter table hata_loglari
  drop constraint if exists fk_hata_machine,
  add constraint fk_hata_machine foreign key (machine_id) references machines(id);


-- Duruş Logları
alter table durus_loglari
  add column if not exists sirket_id uuid references sirketler(id);

do $$
begin
  if exists (select 1 from information_schema.columns where table_name='durus_loglari' and column_name='machine_id' and data_type='text') then
    alter table durus_loglari 
      alter column machine_id type bigint using machine_id::bigint;
  end if;
end $$;

alter table durus_loglari
  drop constraint if exists fk_durus_machine,
  add constraint fk_durus_machine foreign key (machine_id) references machines(id);


-- Reasons tables
alter table stop_reasons
  add column if not exists sirket_id uuid references sirketler(id);

alter table error_reasons
  add column if not exists sirket_id uuid references sirketler(id);

-- 4. Enable RLS for sirketler
alter table sirketler enable row level security;
create policy "Public read for sirketler (opt)" on sirketler for select using (true);
