import { openDb } from "./db";
import { runMigrations } from "./migrate";

/** 读取配置值;键不存在返回默认值(默认为空串)。 */
export function getConfig(key: string, dbPath?: string): string {
  if (key === "point_yen_rate") {
    const db = openDb(dbPath);
    try {
      runMigrations(db);
      const row = db
        .prepare("SELECT value FROM app_config WHERE key = ?")
        .get(key) as { value: string } | undefined;
      return row?.value ?? "1"; // 默认 1 积分 = 1 日元
    } finally {
      db.close();
    }
  }
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const row = db
      .prepare("SELECT value FROM app_config WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? "";
  } finally {
    db.close();
  }
}

export function setConfig(key: string, value: string, dbPath?: string): void {
  if (!key.trim()) throw new Error("配置键不能为空");
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    db.prepare(
      `INSERT INTO app_config (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(key, value);
  } finally {
    db.close();
  }
}
