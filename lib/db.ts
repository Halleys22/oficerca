import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function openDatabase(filename: string) {
  if (filename !== ":memory:") mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)",
  );
  const directory = path.join(process.cwd(), "migrations");
  for (const name of readdirSync(directory)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      // Check under the write lock: simultaneous first starts cannot apply a migration twice.
      if (!db.prepare("SELECT name FROM schema_migrations WHERE name=?").get(name)) {
        db.exec(readFileSync(path.join(directory, name), "utf8"));
        db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run(name, Date.now());
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  return db;
}
const globalDb = globalThis as unknown as { oficercaDb?: DatabaseSync };
export function database() {
  return (globalDb.oficercaDb ??= openDatabase(process.env.DATABASE_PATH || "./data/oficerca.db"));
}
// node:sqlite returns records with a null prototype. Normalize at the boundary so
// all server queries are safe to serialize through React Server Components.
export function all<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return database()
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row })) as T[];
}
export function one<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  const row = database()
    .prepare(sql)
    .get(...params);
  return row ? ({ ...row } as T) : undefined;
}
export function run(sql: string, ...params: SQLInputValue[]) {
  return database()
    .prepare(sql)
    .run(...params);
}
export function transaction<T>(fn: () => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export const id = () => randomUUID();
