-- Migration: Add missing columns and tables
-- Run: sqlite3 database/telemedic.db < database/migrations/20260406_add_missing_tables_and_columns.sql

-- Add missing patient profile columns
ALTER TABLE patients ADD COLUMN weight_kg REAL;
ALTER TABLE patients ADD COLUMN date_of_birth TEXT;
ALTER TABLE patients ADD COLUMN gender TEXT CHECK(gender IN ('male', 'female', 'other'));
ALTER TABLE patients ADD COLUMN emergency_contact TEXT;

-- Messages table for doctor-patient communication
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL REFERENCES users(id),
  receiver_id TEXT NOT NULL REFERENCES users(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);

-- Video consultations table
CREATE TABLE IF NOT EXISTS video_consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting', 'active', 'ended')),
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_video_consultations_patient_id ON video_consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_video_consultations_doctor_id ON video_consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_video_consultations_room_id ON video_consultations(room_id);
