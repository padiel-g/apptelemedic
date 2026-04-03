import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = path.join(process.cwd(), 'src', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'telemedic.db');
const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
const seedPath = path.join(process.cwd(), 'database', 'seed.sql');

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found at ${schemaPath}`);
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  console.log('Executing schema.sql...');
  db.exec(schemaSql);
  
  if (fs.existsSync(seedPath)) {
    console.log('Executing seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    db.exec(seedSql);
  }
  
  console.log('Database initialized successfully at', dbPath);
} catch (error) {
  console.error('Failed to execute database initialization:', error);
  process.exit(1);
} finally {
  db.close();
}
