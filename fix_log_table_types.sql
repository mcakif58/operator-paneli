-- FIX: Log Table Column Types
-- The 'machines' table now uses UUIDs, but the log tables are still expecting BigInt.
-- This script converts the 'machine_id' column in log tables to UUID.

-- 1. Fix durus_loglari
ALTER TABLE public.durus_loglari
ALTER COLUMN machine_id TYPE uuid USING machine_id::text::uuid;

-- 2. Fix hata_loglari
ALTER TABLE public.hata_loglari
ALTER COLUMN machine_id TYPE uuid USING machine_id::text::uuid;

-- 3. Fix sorunsuz_parca_loglari
ALTER TABLE public.sorunsuz_parca_loglari
ALTER COLUMN machine_id TYPE uuid USING machine_id::text::uuid;

-- 4. Fix stop_reasons (Duruş Sebepleri)
-- Use 'company_id' if that's what shows in your DB, but code uses 'sirket_id' mapping?
-- Let's stick to machine_id first.
ALTER TABLE public.stop_reasons
ALTER COLUMN machine_id TYPE uuid USING machine_id::text::uuid;

-- 5. Fix error_reasons (Hata Sebepleri)
ALTER TABLE public.error_reasons
ALTER COLUMN machine_id TYPE uuid USING machine_id::text::uuid;

-- 6. Add Foreign Key Integrity (Optional but recommended for "birbirini doğrulama")
-- This ensures you can ONLY insert logs for valid machines.
ALTER TABLE public.durus_loglari
ADD CONSTRAINT fk_durus_machine
FOREIGN KEY (machine_id) REFERENCES public.machines(id);

ALTER TABLE public.hata_loglari
ADD CONSTRAINT fk_hata_machine
FOREIGN KEY (machine_id) REFERENCES public.machines(id);

ALTER TABLE public.sorunsuz_parca_loglari
ADD CONSTRAINT fk_parca_machine
FOREIGN KEY (machine_id) REFERENCES public.machines(id);
