import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { databasePath } from "@/lib/config";
import { migrate } from "./migrations";

export type Db = Database.Database;

export function openDatabase(path: string): Db {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}

// Kept on globalThis so dev-mode hot reloads reuse one connection.
const globalForDb = globalThis as typeof globalThis & { appDb?: Db };

export function getDb(): Db {
  globalForDb.appDb ??= openDatabase(databasePath());
  return globalForDb.appDb;
}
