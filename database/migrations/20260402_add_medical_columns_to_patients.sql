-- Migration: Add medical record columns to patients table
ALTER TABLE patients ADD COLUMN blood_type TEXT;
ALTER TABLE patients ADD COLUMN conditions TEXT;
ALTER TABLE patients ADD COLUMN allergies TEXT;
ALTER TABLE patients ADD COLUMN medications TEXT;
ALTER TABLE patients ADD COLUMN medical_notes TEXT;
ALTER TABLE patients ADD COLUMN height_cm REAL;
ALTER TABLE patients ADD COLUMN weight_kg REAL;