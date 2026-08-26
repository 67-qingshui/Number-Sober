import fs from "node:fs";
import path from "node:path";
import { openDb, DEFAULT_DB_PATH } from "./db";
import { runMigrations } from "./migrate";

const SQLITE_MAGIC = "SQLite format 3";

export interface ExportResult {
  path: string;
  size: number;
  createdAt: string;
}

/**
 * 导出备份:用 SQLite 在线备份 API 把当前库完整复制到目标路径。
 */
export async function exportBackup(
  destPath: string,
  dbPath?: string,
): Promise<ExportResult> {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    await db.backup(destPath); // 异步 API,必须 await
  } finally {
    db.close();
  }

  return {
    path: destPath,
    size: fs.statSync(destPath).size,
    createdAt: new Date().toISOString(),
  };
}

/** 校验文件是否为合法 SQLite 数据库。 */
export function verifyBackup(filePath: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(15);
      const read = fs.readSync(fd, buf, 0, 15, 0);
      return read === 15 && buf.toString("utf8", 0, 15) === SQLITE_MAGIC;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

/** 解析实际库路径(与 openDb 相同逻辑)。 */
function resolveDbPath(dbPath?: string): string {
  return dbPath ?? process.env.NS_DB_PATH ?? DEFAULT_DB_PATH;
}

/**
 * 导入备份:先校验文件头,再用备份库覆盖当前库(先写临时文件后原子替换)。
 */
export function importBackup(srcPath: string, dbPath?: string): void {
  if (!verifyBackup(srcPath)) throw new Error("不是有效的备份文件");

  const target = resolveDbPath(dbPath);
  // 先关不掉正在使用的连接(服务进程),因此采用「复制到目标路径」策略:
  // 备份库 → 临时文件 → 原子替换目标。已打开的旧连接仍指向同一 inode 的旧数据,
  // 重启应用后生效;测试场景无长驻连接,立即生效。
  const tmp = target + ".restore-tmp";
  fs.copyFileSync(srcPath, tmp);
  fs.renameSync(tmp, target);
}
