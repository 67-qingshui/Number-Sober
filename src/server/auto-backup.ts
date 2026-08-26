import fs from "node:fs";
import path from "node:path";
import { exportBackup } from "./backup";

const STAMP_FILE = ".last-backup";

/** 距上次备份是否已超过 intervalHours。 */
export function shouldBackup(
  lastBackupAt: Date | null,
  now: Date,
  intervalHours: number,
): boolean {
  if (!lastBackupAt) return true;
  return now.getTime() - lastBackupAt.getTime() >= intervalHours * 3600_000;
}

function readLastStamp(backupDir: string): Date | null {
  try {
    const raw = fs.readFileSync(path.join(backupDir, STAMP_FILE), "utf8").trim();
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function writeStamp(backupDir: string, at: Date): void {
  fs.writeFileSync(path.join(backupDir, STAMP_FILE), at.toISOString());
}

/**
 * 定时备份入口:满足间隔则执行一次备份并清理超额旧备份。
 */
export async function autoBackup(opts: {
  dbPath?: string;
  backupDir: string;
  intervalHours: number;
  keepCount: number;
  now?: Date;
}): Promise<{ performed: boolean; path?: string }> {
  const now = opts.now ?? new Date();
  if (!fs.existsSync(opts.backupDir))
    fs.mkdirSync(opts.backupDir, { recursive: true });

  const last = readLastStamp(opts.backupDir);
  if (!shouldBackup(last, now, opts.intervalHours)) return { performed: false };

  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dest = path.join(opts.backupDir, `number-sober-${stamp}.db`);
  await exportBackup(dest, opts.dbPath);
  writeStamp(opts.backupDir, now);
  pruneOldBackups(opts.backupDir, opts.keepCount);
  return { performed: true, path: dest };
}

/** 清理旧备份,只保留最新 keepCount 个。返回删除数量。 */
export function pruneOldBackups(dir: string, keepCount: number): number {
  const files = listBackupsByAge(dir);
  if (files.length <= keepCount) return 0;
  const toDelete = files.slice(keepCount);
  for (const f of toDelete) fs.unlinkSync(f);
  return toDelete.length;
}

/** 按 mtime 新→旧排序的备份文件完整路径。 */
export function listBackupsByAge(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const full = path.join(dir, f);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .map((e) => e.full);
}
