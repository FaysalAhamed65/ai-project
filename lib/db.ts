import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let dbSingleton: Database.Database | null = null;

function getDbFilePath() {
  return path.join(process.cwd(), "data", "app.db");
}

function hasColumn(d: Database.Database, table: string, column: string) {
  const rows = d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

export function db() {
  if (dbSingleton) return dbSingleton;

  const dbPath = getDbFilePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");

  instance.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      username TEXT,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      image_order_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ratings (
      participant_id TEXT NOT NULL,
      image_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (participant_id, image_id)
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS completion_emails (
      participant_id TEXT PRIMARY KEY,
      sent_at INTEGER NOT NULL
    );
  `);

  // Lightweight migration support for older DB files.
  if (!hasColumn(instance, "participants", "username")) {
    instance.exec(`ALTER TABLE participants ADD COLUMN username TEXT;`);
  }

  dbSingleton = instance;
  return instance;
}

