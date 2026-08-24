import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/** 默认数据库路径:可用环境变量 NS_DB_PATH 覆盖(测试注入临时文件) */
export const DEFAULT_DB_PATH =
  process.env.NS_DB_PATH ?? path.join(process.cwd(), ".data", "number-sober.db");

export function openDb(dbPath: string = DEFAULT_DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return new Database(dbPath);
}
