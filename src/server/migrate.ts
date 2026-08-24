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
