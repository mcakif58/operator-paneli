-- Add machine_id column to tables
ALTER TABLE operators ADD COLUMN machine_id text;
ALTER TABLE stop_reasons ADD COLUMN machine_id text;
ALTER TABLE error_reasons ADD COLUMN machine_id text;
ALTER TABLE sorunsuz_parca_loglari ADD COLUMN machine_id text;
ALTER TABLE hata_loglari ADD COLUMN machine_id text;
ALTER TABLE durus_loglari ADD COLUMN machine_id text;

-- Add machine_id to policies if you want to strictly enforce it at DB level (omitted for flexibility but recommended for production)
-- For now, we rely on the application filtering.
