-- Migration: Add missing columns for manual readings
ALTER TABLE readings ADD COLUMN bp_sys INTEGER;
ALTER TABLE readings ADD COLUMN bp_dia INTEGER;
ALTER TABLE readings ADD COLUMN source TEXT NOT NULL DEFAULT 'device';
ALTER TABLE readings ADD COLUMN notes TEXT;
