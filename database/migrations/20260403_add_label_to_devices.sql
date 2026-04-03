-- Migration: Add label column to devices table
ALTER TABLE devices ADD COLUMN label TEXT;
