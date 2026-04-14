-- SQLite Schema for Telemedic (migrated from Supabase PostgreSQL)
-- Run: sqlite3 database/telemedic.db < schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
  is_active INTEGER DEFAULT 1,
  specialization TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Patients table (one-to-one with patient users)
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  assigned_doctor_id TEXT REFERENCES users(id),
  date_of_birth TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_type TEXT,
  emergency_contact TEXT,
  conditions TEXT,
  allergies TEXT,
  medications TEXT,
  medical_notes TEXT,
  height_cm REAL,
  weight_kg REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  label TEXT,
  is_active INTEGER DEFAULT 1,
  last_seen_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Readings table
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  pulse INTEGER NOT NULL,
  temperature REAL NOT NULL,
  oxygen INTEGER NOT NULL,
  bp_sys REAL,
  bp_dia REAL,
  source TEXT NOT NULL DEFAULT 'device',
  notes TEXT,
  is_abnormal INTEGER DEFAULT 0,
  recorded_at TEXT DEFAULT (datetime('now'))
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reading_id INTEGER REFERENCES readings(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'vitals',
  message TEXT,
  is_resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Messages table
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

-- Symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'mild',
  body_area TEXT,
  onset_date TEXT,
  is_resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit logs table (inferred)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_doctor ON patients(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_readings_patient_id ON readings(patient_id);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON readings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_devices_patient_id ON devices(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_id ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_patient_id ON symptoms(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
