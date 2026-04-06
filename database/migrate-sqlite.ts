import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database/telemedic.db');

console.log('Migrating Telemedic to SQLite...');

const db = new Database(DB_PATH, { verbose: console.log });

// Run schema
const schemaSql = fs.readFileSync(path.join(process.cwd(), 'database/schema.sql'), 'utf8');
db.exec(schemaSql);
console.log('✓ Schema applied');

// Run seed data
const seedSql = `
-- Admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password_hash, full_name, role) VALUES
('admin@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'System Admin', 'admin');

-- Doctor users (password: password123)
INSERT OR IGNORE INTO users (email, password_hash, full_name, role, specialization) VALUES
('gerald@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Dr. Gerald T Padiel', 'doctor', 'Cardiology'),
('doctor2@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Dr. Sarah Johnson', 'doctor', 'Infectious Disease'),
('doctor3@telemedic.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Dr. James Wilson', 'doctor', 'General Practice');

-- Patient users (password: password123)
INSERT OR IGNORE INTO users (email, password_hash, full_name, role) VALUES
('takudzwa@gmail.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Takudzwa Padiel', 'patient'),
('patient2@gmail.com', '$2a$12$LJ3m4ys3GZxkFMQOFKzBGe8Yj8JYoJYLFPz.T1bRqx0VHNq.V4K6e', 'Jane Smith', 'patient');

-- Create patient profiles
INSERT OR IGNORE INTO patients (user_id, conditions, assigned_doctor_id)
SELECT u.id, 'hypertension', d.id FROM users u, users d WHERE u.email = 'takudzwa@gmail.com' AND d.email = 'gerald@telemedic.com';

INSERT OR IGNORE INTO patients (user_id, conditions, assigned_doctor_id)
SELECT u.id, 'malaria', d.id FROM users u, users d WHERE u.email = 'patient2@gmail.com' AND d.email = 'doctor2@telemedic.com';
`;
db.exec(seedSql);
console.log('✓ Seed data inserted');

// Run pending migrations
const migrationsDir = path.join(process.cwd(), 'database/migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const migrationPath = path.join(migrationsDir, file);
  console.log(`Running migration: ${file}`);
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(migrationSql);
  console.log(`✓ ${file} applied`);
}
console.log('✓ All migrations applied');

db.close();
console.log('✓ Migration complete! DB ready at', DB_PATH);
