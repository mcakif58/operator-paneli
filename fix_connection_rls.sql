-- FIX: Enable Public Read Access for Machines
-- This is required because the "Machine Selection" screen appears BEFORE login.

-- 1. Enable RLS on machines (if not already enabled)
alter table machines enable row level security;

-- 2. Drop existing policy if it conflicts (optional, but safe)
drop policy if exists "Public read for machines" on machines;
drop policy if exists "Enable read access for all users" on machines;

-- 3. Create a policy allowing EVERYONE (anon + authenticated) to SELECT
create policy "Public read for machines" 
on machines for select 
using (true);

-- 4. Do the same for 'sirketler' (Companies) just in case
alter table sirketler enable row level security;
drop policy if exists "Public read for sirketler" on sirketler;
create policy "Public read for sirketler" 
on sirketler for select 
using (true);

-- 5. Optional: Grant select permission to anon role explicitly
grant select on table machines to anon;
grant select on table sirketler to anon;
