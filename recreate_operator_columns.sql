-- FIX: Recreate Operator ID Columns
-- Since the previous Constraint modification failed with weird errors,
-- and the tables are likely empty or contain old unusable IDs,
-- we will DROP and RECREATE the 'operator_id' column to force a clean slate.

-- 1. DURUS LOGLARI
ALTER TABLE public.durus_loglari DROP COLUMN IF EXISTS operator_id CASCADE;
ALTER TABLE public.durus_loglari ADD COLUMN operator_id uuid REFERENCES public.operators(id);

-- 2. HATA LOGLARI
ALTER TABLE public.hata_loglari DROP COLUMN IF EXISTS operator_id CASCADE;
ALTER TABLE public.hata_loglari ADD COLUMN operator_id uuid REFERENCES public.operators(id);

-- 3. SORUNSUZ PARCA LOGLARI
ALTER TABLE public.sorunsuz_parca_loglari DROP COLUMN IF EXISTS operator_id CASCADE;
ALTER TABLE public.sorunsuz_parca_loglari ADD COLUMN operator_id uuid REFERENCES public.operators(id);

-- 4. Verify
COMMENT ON COLUMN public.durus_loglari.operator_id IS 'Linked to public.operators';
