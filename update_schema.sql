-- Add operator_name column to log tables
alter table sorunsuz_parca_loglari add column operator_name text;
alter table hata_loglari add column operator_name text;
alter table durus_loglari add column operator_name text;
