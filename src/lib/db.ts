import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./env";

type GlobalWithDb = typeof globalThis & { __wishlistDb?: DatabaseSync };

function migrate(db: DatabaseSync) {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA busy_timeout = 5000;");

  let version = Number(
    (db.prepare("PRAGMA user_version").get() as { user_version?: number })?.user_version || 0,
  );

  if (version < 1) {
    db.exec("BEGIN");
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          default_wishlist_id INTEGER,
          notify_enabled INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

        CREATE TABLE IF NOT EXISTS wishlists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          image_path TEXT,
          end_date TEXT,
          recurrence TEXT NOT NULL DEFAULT 'none'
            CHECK (recurrence IN ('none', 'weekly', 'monthly', 'yearly')),
          is_public INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS wishlists_owner ON wishlists(owner_id);
        CREATE INDEX IF NOT EXISTS wishlists_public ON wishlists(is_public, updated_at);

        CREATE TABLE IF NOT EXISTS wishlist_collaborators (
          wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          PRIMARY KEY (wishlist_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS collaborators_user ON wishlist_collaborators(user_id);

        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          url TEXT,
          description TEXT,
          note TEXT,
          price_cents INTEGER,
          currency TEXT NOT NULL DEFAULT 'GBP',
          image_url TEXT,
          domain TEXT,
          claimed_at TEXT,
          claimed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          claimed_by_name TEXT,
          in_stock INTEGER,
          last_checked_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS items_wishlist ON items(wishlist_id, created_at);
        CREATE INDEX IF NOT EXISTS items_domain ON items(wishlist_id, domain);
        CREATE INDEX IF NOT EXISTS items_unclaimed ON items(claimed_at, last_checked_at);

        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS push_subscriptions_user ON push_subscriptions(user_id);

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      db.exec("PRAGMA user_version = 1;");
      db.exec("COMMIT");
      version = 1;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  if (version < 2) {
    db.exec("BEGIN");
    try {
      const wishlistColumns = db.prepare("PRAGMA table_info(wishlists)").all() as unknown as {
        name: string;
      }[];
      if (!wishlistColumns.some((column) => column.name === "accent_color")) {
        db.exec("ALTER TABLE wishlists ADD COLUMN accent_color TEXT;");
      }

      const userColumns = db.prepare("PRAGMA table_info(users)").all() as unknown as {
        name: string;
      }[];
      if (!userColumns.some((column) => column.name === "preferred_currency")) {
        db.exec(
          "ALTER TABLE users ADD COLUMN preferred_currency TEXT NOT NULL DEFAULT 'GBP';",
        );
      }

      db.exec("PRAGMA user_version = 2;");
      db.exec("COMMIT");
      version = 2;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  if (version < 3) {
    db.exec("BEGIN");
    try {
      const userColumns = db.prepare("PRAGMA table_info(users)").all() as unknown as {
        name: string;
      }[];
      if (!userColumns.some((column) => column.name === "theme")) {
        db.exec("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'system';");
      }
      db.exec("PRAGMA user_version = 3;");
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export function getDb(): DatabaseSync {
  const g = globalThis as GlobalWithDb;
  if (g.__wishlistDb) return g.__wishlistDb;

  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(path.join(config.dataDir, "uploads"), { recursive: true });

  const db = new DatabaseSync(path.join(config.dataDir, "wishlist.db"));
  migrate(db);
  g.__wishlistDb = db;
  return db;
}

export function transaction<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}
