-- FIX: Enable Public Read Access for Operators (Required for RFID Login)
-- The login screen runs as an 'anonymous' user, so it needs permission to search the operators table.

-- 1. Enable RLS on operators
alter table operators enable row level security;

-- 2. Drop existing restrictive policies if any
drop policy if exists "Public read for operators" on operators;
drop policy if exists "Enable read access for all users" on operators;

-- 3. Create a policy allowing EVERYONE to SELECT (Read-only)
-- This allows the login screen to find the operator by card_id
create policy "Public read for operators" 
on operators for select 
using (true);

-- 4. Grant explicit permissions to anon role
grant select on table operators to anon;
