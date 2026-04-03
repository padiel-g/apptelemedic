-- Migration: Make device_id nullable in readings table (SQLite does not support DROP NOT NULL directly)
-- 1. Create new table with device_id nullable
CREATE TABLE readings_new (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    device_id INTEGER,
    pulse INTEGER NOT NULL,
    temperature REAL NOT NULL,
    oxygen INTEGER NOT NULL,
    bp_sys REAL,
    bp_dia REAL,
    source TEXT NOT NULL DEFAULT 'device',
    notes TEXT,
    is_abnormal INTEGER DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
);
-- 2. Copy data
INSERT INTO readings_new (id, patient_id, device_id, pulse, temperature, oxygen, bp_sys, bp_dia, source, notes, is_abnormal, recorded_at)
SELECT id, patient_id, device_id, pulse, temperature, oxygen, bp_sys, bp_dia, source, notes, is_abnormal, recorded_at FROM readings;
-- 3. Drop old table
DROP TABLE readings;
-- 4. Rename new table
ALTER TABLE readings_new RENAME TO readings;
