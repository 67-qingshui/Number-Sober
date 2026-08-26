import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * 默认数据库路径:可用环境变量 NS_DB_PATH 覆盖(测试注入临时文件)。
 * 打包(Electron)时 cwd 是 app 资源目录,数据写到用户数据目录。
 */
export const DEFAULT_DB_PATH =
  process.env.NS_DB_PATH ?? path.join(process.cwd(), ".data", "number-sober.db");

/**
 * 解析原生模块 better-sqlite3。
 * Turbopack 会把 serverExternalPackages 重命名为哈希别名(如 better-sqlite3-xxxx),
 * 在 asar 包内无法解析。这里绕过打包器,运行时用 createRequire 从真实路径加载:
 * 优先 asar.unpacked(electron-builder 解包的原生二进制),退化到普通 node_modules。
 */
function loadBetterSqlite3(): typeof import("better-sqlite3") {
  const nodeRequire = createRequire(__filename);

  const candidates = [
    // Electron 打包:asar.unpacked 中的真实文件
    (process as unknown as { resourcesPath?: string }).resourcesPath
      ? path.join(
          (process as unknown as { resourcesPath: string }).resourcesPath,
          "app.asar.unpacked",
          "node_modules",
          "better-sqlite3",
        )
      : null,
    // 开发/普通 Node 环境
    path.join(process.cwd(), "node_modules", "better-sqlite3"),
    // 兜底:标准解析
    "better-sqlite3",
  ].filter((p): p is string => p !== null);

  for (const candidate of candidates) {
    try {
      return nodeRequire(candidate);
    } catch {
      // 尝试下一个候选路径
    }
  }
  throw new Error("无法加载 better-sqlite3 原生模块");
}

const Database = loadBetterSqlite3();

export function openDb(dbPath: string = DEFAULT_DB_PATH): import("better-sqlite3").Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return new Database(dbPath);
}
