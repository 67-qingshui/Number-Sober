import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/**
 * 迁移清单:只增不改。已发布的迁移 SQL 永不再编辑;
 * 需要变更 schema 时追加新版本。
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "init-meta",
    sql: `CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
          INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');`,
  },
  {
    version: 2,
    name: "create-persons",
    sql: `CREATE TABLE IF NOT EXISTS persons (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            note       TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '2')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 3,
    name: "create-admin",
    sql: `CREATE TABLE IF NOT EXISTS admin (
            id            INTEGER PRIMARY KEY CHECK (id = 1),
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '3')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 4,
    name: "create-sessions",
    sql: `CREATE TABLE IF NOT EXISTS sessions (
            id         TEXT PRIMARY KEY,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '4')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 5,
    name: "create-aa",
    sql: `CREATE TABLE IF NOT EXISTS aa_bills (
            id         TEXT PRIMARY KEY,
            title      TEXT NOT NULL,
            bill_date  TEXT NOT NULL,
            payer_id   TEXT NOT NULL REFERENCES persons(id),
            status     TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS aa_bill_items (
            id          TEXT PRIMARY KEY,
            bill_id     TEXT NOT NULL REFERENCES aa_bills(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            amount      INTEGER NOT NULL,
            split_mode  TEXT NOT NULL DEFAULT 'equal',
            position    INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS aa_bill_item_participants (
            item_id   TEXT NOT NULL REFERENCES aa_bill_items(id) ON DELETE CASCADE,
            person_id TEXT NOT NULL REFERENCES persons(id),
            share     REAL,
            PRIMARY KEY (item_id, person_id)
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '5')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
             version    INTEGER PRIMARY KEY,
             name       TEXT NOT NULL,
             applied_at TEXT NOT NULL DEFAULT (datetime('now'))
           )`);
  const applied = new Set(
    (db.prepare("SELECT version FROM _migrations").all() as { version: number }[]).map(
      (r) => r.version,
    ),
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      db.prepare("INSERT INTO _migrations (version, name) VALUES (?, ?)").run(m.version, m.name);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
