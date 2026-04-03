import fs from 'fs';
import path from 'path';
import { db } from '../src/lib/db';

const migrationsDir = path.join(__dirname, 'migrations');

function getMigrationFiles() {
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function runMigration(file: string) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  db.exec(sql);
  console.log(`Applied migration: ${file}`);
}

export function migrate() {
  const files = getMigrationFiles();
  for (const file of files) {
    runMigration(file);
  }
}

if (require.main === module) {
  migrate();
  console.log('All migrations applied.');
}
