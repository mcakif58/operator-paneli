-- Drop existing restrictive policies
drop policy if exists "Enable insert for authenticated users only" on sorunsuz_parca_loglari;
drop policy if exists "Enable insert for authenticated users only" on hata_loglari;
drop policy if exists "Enable insert for authenticated users only" on durus_loglari;
drop policy if exists "Enable update for authenticated users only" on durus_loglari;

-- Create new policies allowing public (anon) access
-- This is necessary because operators select their name without a password login (Kiosk mode)

-- 1. Sorunsuz Parça Logları
create policy "Enable insert for all users" on sorunsuz_parca_loglari for insert to public with check (true);

-- 2. Hata Logları
create policy "Enable insert for all users" on hata_loglari for insert to public with check (true);

-- 3. Duruş Logları
create policy "Enable insert for all users" on durus_loglari for insert to public with check (true);
create policy "Enable update for all users" on durus_loglari for update to public using (true);
