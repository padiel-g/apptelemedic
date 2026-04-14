const Database = require('better-sqlite3');
const db = new Database('database/telemedic.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));
for (const tbl of ['patients', 'messages', 'alerts']) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${tbl})`).all();
    console.log(`${tbl} cols:`, cols.map(c => c.name));
  } catch (e) {
    console.log(`${tbl}: MISSING`);
  }
}
db.close();
