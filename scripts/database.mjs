import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ClubDatabase, databasePath } from '../lib/storage.mjs';
export function migrate() {
  const db = new ClubDatabase(databasePath());
  try {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
    const directory = fileURLToPath(new URL('../drizzle/', import.meta.url));
    for (const name of readdirSync(directory).filter(name => /^\d+_.+\.sql$/.test(name)).sort()) {
      const sql = readFileSync(directory + name, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = db.connection.prepare('SELECT checksum FROM schema_migrations WHERE name=?').get(name);
      if (existing) {
        if (existing.checksum !== checksum) throw new Error('Applied migration changed: ' + name);
        continue;
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec(sql);
        db.connection.prepare('INSERT INTO schema_migrations VALUES(?,?,?)').run(name, checksum, new Date().toISOString());
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  } finally { db.close(); }
}
