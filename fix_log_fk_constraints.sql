-- FIX: Log Table Foreign Keys (Operator ID)
-- This script repoints the 'operator_id' foreign key to the 'public.operators' table.
-- Currently, it likely points to 'auth.users', causing foreign key violations for RFID operators.

-- 1. DURUS LOGLARI (Stop Logs)
ALTER TABLE public.durus_loglari
DROP CONSTRAINT IF EXISTS durus_loglari_operator_id_fkey; -- Drop old constraint

ALTER TABLE public.durus_loglari
ADD CONSTRAINT durus_loglari_operator_id_fkey
FOREIGN KEY (operator_id) REFERENCES public.operators(id); -- Point to operators table

-- 2. HATA LOGLARI (Error Logs)
ALTER TABLE public.hata_loglari
DROP CONSTRAINT IF EXISTS hata_loglari_operator_id_fkey;

ALTER TABLE public.hata_loglari
ADD CONSTRAINT hata_loglari_operator_id_fkey
FOREIGN KEY (operator_id) REFERENCES public.operators(id);

-- 3. SORUNSUZ PARCA LOGLARI (Good Part Logs)
ALTER TABLE public.sorunsuz_parca_loglari
DROP CONSTRAINT IF EXISTS sorunsuz_parca_loglari_operator_id_fkey;

ALTER TABLE public.sorunsuz_parca_loglari
ADD CONSTRAINT sorunsuz_parca_loglari_operator_id_fkey
FOREIGN KEY (operator_id) REFERENCES public.operators(id);

-- 4. Reload Schema Cache (Metadata)
-- Sometimes Supabase caches the old schema. Running a comment or trivial change can trigger refresh.
COMMENT ON TABLE public.durus_loglari IS 'Production Stop Logs';
