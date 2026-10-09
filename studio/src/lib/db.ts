import "server-only";
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.DATABASE_URL || "file:./data/app.db";
  if (url.startsWith("file:")) {
    mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  }
  client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    prompt TEXT NOT NULL,
    params TEXT NOT NULL,
    cost INTEGER NOT NULL,
    status TEXT NOT NULL,
    provider_request_id TEXT,
    outputs TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS jobs_user_created ON jobs(user_id, created_at DESC)`,
];

/** Returns the DB client, creating tables on first use. */
export async function db(): Promise<Client> {
  const c = getClient();
  if (!ready) {
    ready = c.batch(SCHEMA, "write").then(() => undefined);
    ready.catch(() => {
      ready = null;
    });
  }
  await ready;
  return c;
}
