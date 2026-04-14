const Database = require('better-sqlite3');
const db = new Database('database/telemedic.db');
db.exec('PRAGMA foreign_keys = ON;');

function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  Added ${table}.${column}`);
  } else {
    console.log(`  ${table}.${column} already exists`);
  }
}

console.log('--- Migrating patients table ---');
addColumnIfMissing('patients', 'date_of_birth', 'TEXT');
addColumnIfMissing('patients', 'gender', "TEXT CHECK (gender IN ('male', 'female', 'other'))");
addColumnIfMissing('patients', 'emergency_contact', 'TEXT');
addColumnIfMissing('patients', 'weight_kg', 'REAL');
addColumnIfMissing('patients', 'created_at', 'TEXT');

console.log('--- Migrating messages table ---');
addColumnIfMissing('messages', 'patient_id', 'INTEGER REFERENCES patients(id)');
addColumnIfMissing('messages', 'doctor_id', 'TEXT REFERENCES users(id)');

console.log('--- Migrating alerts table ---');
addColumnIfMissing('alerts', 'reading_id', 'INTEGER REFERENCES readings(id)');

console.log('--- Creating indexes ---');
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON messages(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)',
  'CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id)',
];
indexes.forEach(sql => db.exec(sql));
console.log('  Indexes created');

db.close();
console.log('Migration complete!');
