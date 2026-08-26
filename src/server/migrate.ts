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
  {
    version: 6,
    name: "aa-bill-settled-at",
    sql: `ALTER TABLE aa_bills ADD COLUMN settled_at TEXT;
          INSERT INTO meta (key, value) VALUES ('schema_version', '6')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 7,
    name: "create-items",
    sql: `CREATE TABLE IF NOT EXISTS items (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            category        TEXT NOT NULL DEFAULT 'asset',
            purchase_price  INTEGER NOT NULL,
            purchase_date   TEXT NOT NULL,
            lifespan_months INTEGER,
            stock           INTEGER,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '7')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 8,
    name: "create-usage-records",
    sql: `CREATE TABLE IF NOT EXISTS usage_records (
            id         TEXT PRIMARY KEY,
            item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            start_at   TEXT NOT NULL,
            end_at     TEXT NOT NULL,
            note       TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_usage_item ON usage_records(item_id, start_at);
          INSERT INTO meta (key, value) VALUES ('schema_version', '8')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 9,
    name: "create-stock-changes",
    sql: `CREATE TABLE IF NOT EXISTS stock_changes (
            id         TEXT PRIMARY KEY,
            item_id    TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
            delta      INTEGER NOT NULL,
            note       TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_stock_item ON stock_changes(item_id);
          INSERT INTO meta (key, value) VALUES ('schema_version', '9')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 10,
    name: "create-token-entries",
    sql: `CREATE TABLE IF NOT EXISTS token_entries (
            id               TEXT PRIMARY KEY,
            entry_date       TEXT NOT NULL,
            provider         TEXT NOT NULL,
            model            TEXT NOT NULL,
            input_tokens     INTEGER NOT NULL,
            cache_hit_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens    INTEGER NOT NULL,
            cost             REAL NOT NULL DEFAULT 0,
            created_at       TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '10')
            ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
  },
  {
    version: 11,
    name: "create-model-prices",
    sql: `CREATE TABLE IF NOT EXISTS model_prices (
            model           TEXT PRIMARY KEY,
            input_price     REAL NOT NULL,
            output_price    REAL NOT NULL,
            cache_hit_price REAL NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO meta (key, value) VALUES ('schema_version', '11')
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
