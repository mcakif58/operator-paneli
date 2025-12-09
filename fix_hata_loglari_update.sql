-- Add duzeltilme_zamani column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hata_loglari' AND column_name = 'duzeltilme_zamani') THEN
        ALTER TABLE hata_loglari ADD COLUMN duzeltilme_zamani timestamp with time zone;
    END IF;
END $$;

-- Enable update policy for authenticated users
CREATE POLICY "Enable update for authenticated users only" ON hata_loglari 
FOR UPDATE TO authenticated 
USING (auth.uid() = operator_id)
WITH CHECK (auth.uid() = operator_id);
