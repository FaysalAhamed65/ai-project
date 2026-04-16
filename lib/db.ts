import path from "node:path";
import { createClient, type Client } from "@libsql/client";

let clientSingleton: Client | null = null;
let schemaReady: Promise<void> | null = null;

function localFileUrl() {
  const dbPath = path.join(process.cwd(), "data", "app.db");
  // libsql uses file: URLs for local development
  return `file:${dbPath}`;
}

function getClient() {
  if (clientSingleton) return clientSingleton;

  const url = process.env.TURSO_DATABASE_URL || localFileUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;

  clientSingleton = createClient(
    authToken ? { url, authToken } : { url }
  );
  return clientSingleton;
}

async function ensureSchema(c: Client) {
  await c.execute(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      username TEXT,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      image_order_json TEXT NOT NULL
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS ratings (
      participant_id TEXT NOT NULL,
      image_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (participant_id, image_id)
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS revote_history (
      participant_id TEXT NOT NULL,
      image_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (participant_id, image_id)
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    )
  `);

  await c.execute(`
    CREATE TABLE IF NOT EXISTS completion_emails (
      participant_id TEXT PRIMARY KEY,
      sent_at INTEGER NOT NULL
    )
  `);
}

export async function db(): Promise<Client> {
  const c = getClient();
  if (!schemaReady) {
    schemaReady = ensureSchema(c);
  }
  await schemaReady;
  return c;
}

