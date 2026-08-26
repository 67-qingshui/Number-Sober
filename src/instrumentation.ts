/**
 * Next.js 服务端启动钩子:注册定时自动备份。
 * 每 30 分钟检查一次,实际备份间隔由 AUTO_BACKUP_INTERVAL_HOURS 控制(默认 24h)。
 */
export async function register() {
  // 仅 Node 运行时执行(排除 edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { autoBackup } = await import("@/server/auto-backup");
  const { DEFAULT_DB_PATH } = await import("@/server/db");
  const path = await import("node:path");
  const fs = await import("node:fs");

  const backupDir = path.join(
    path.dirname(DEFAULT_DB_PATH),
    "backups",
  );

  const BACKUP_DIR = backupDir;

  const tick = () => {
    autoBackup({
      dbPath: undefined,
      backupDir: BACKUP_DIR,
      intervalHours: Number(process.env.AUTO_BACKUP_INTERVAL_HOURS ?? 24),
      keepCount: 7,
    }).catch(() => {
      // 备份失败不阻断应用,静默重试下次
    });
  };

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  tick(); // 启动时立即判断一次
  setInterval(tick, 30 * 60_000); // 之后每 30 分钟检查
}
