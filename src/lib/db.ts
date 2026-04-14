import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database/telemedic.db');

// Singleton DB instance
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec('PRAGMA foreign_keys = ON;');
  }
  return db;
}

// ✅ FIX 1: stmt.all() expects spread args, not an array wrapper
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const dbInstance = getDb();
  const stmt = dbInstance.prepare(sql);
  return stmt.all(...params) as T[];
}

// ✅ FIX 2: stmt.get() expects spread args — was passing spread of Object.values correctly,
//           but we also need to handle zero-condition case safely
export function getOne<T = any>(table: string, conditions: Record<string, any>): T | null {
  const dbInstance = getDb();
  const keys = Object.keys(conditions);
  if (keys.length === 0) return null;
  const whereClause = keys.map(key => `${key} = ?`).join(' AND ');
  const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
  const stmt = dbInstance.prepare(sql);
  const row = stmt.get(...Object.values(conditions)) as T | undefined;
  return row ?? null;
}

// ✅ FIX 3: insertOne was correct structurally but return type cast improved
export function insertOne<T = any>(table: string, row: Record<string, any>): T {
  const dbInstance = getDb();
  const keys = Object.keys(row).join(', ');
  const placeholders = Object.keys(row).map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
  const stmt = dbInstance.prepare(sql);
  const result = stmt.run(...Object.values(row));
  return { id: result.lastInsertRowid, ...row } as T;
}

// ✅ FIX 4: updateWhere was calling query(table, conditions) which is WRONG —
//           query() expects a full SQL string, not a table name.
//           Fixed to run a proper SELECT after update.
export function updateWhere(
  table: string,
  conditions: Record<string, any>,
  updates: Record<string, any>
): any[] {
  const dbInstance = getDb();
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const params = [...Object.values(updates), ...Object.values(conditions)];
  const stmt = dbInstance.prepare(sql);
  stmt.run(...params);

  // ✅ Now correctly fetch updated rows
  const selectSql = `SELECT * FROM ${table} WHERE ${whereClause}`;
  const selectStmt = dbInstance.prepare(selectSql);
  return selectStmt.all(...Object.values(conditions));
}

// ✅ deleteWhere was correct — no changes needed
export function deleteWhere(table: string, conditions: Record<string, any>): void {
  const dbInstance = getDb();
  const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  const stmt = dbInstance.prepare(sql);
  stmt.run(...Object.values(conditions));
}

// ✅ FIX 5: Removed broken `export const supabase = getDb()` —
//           better-sqlite3 is NOT Supabase. Exporting a raw DB instance
//           as "supabase" would cause silent type mismatches everywhere.
//           Use getDb() directly where needed, or use the helpers above.

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export { getDb };