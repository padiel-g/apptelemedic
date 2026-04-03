import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'src', 'db', 'telemedic.db');

let db: Database.Database;

try {
  db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : undefined });
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (error) {
  console.error('Failed to initialize SQLite database:', error);
  process.exit(1);
}

export { db };

export function runQuery(sql: string, params: any[] = []) {
  return db.prepare(sql).run(...params);
}

export function getQuery<T>(sql: string, params: any[] = []): T | undefined {
  return db.prepare(sql).get(...params) as T;
}

export function allQuery<T>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}
