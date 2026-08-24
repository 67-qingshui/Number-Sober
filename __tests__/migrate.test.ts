import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { runMigrations, MIGRATIONS } from "@/server/migrate";

describe("数据库迁移", () => {
  let db: Database.Database;
  let file: string;

  beforeEach(() => {
    file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "test.db");
    db = new Database(file);
  });

  it("首次运行应用全部迁移并记录版本", () => {
    runMigrations(db);
    const applied = db
      .prepare("SELECT version FROM _migrations ORDER BY version")
      .all() as { version: number }[];
    expect(applied.map((r) => r.version)).toEqual(MIGRATIONS.map((m) => m.version));
    const meta = db
      .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
      .get() as { value: string };
    expect(meta.value).toBe(String(MIGRATIONS.at(-1)!.version));
  });

  it("重复运行幂等,不重复应用", () => {
    runMigrations(db);
    runMigrations(db);
    const count = (
      db.prepare("SELECT COUNT(*) AS c FROM _migrations").get() as { c: number }
    ).c;
    expect(count).toBe(MIGRATIONS.length);
  });
});
