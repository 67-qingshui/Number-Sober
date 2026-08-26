/**
 * Next.js 服务端启动钩子:注册定时自动备份。
 * 每 30 分钟检查一次,实际备份间隔由 AUTO_BACKUP_INTERVAL_HOURS 控制(默认 24h)。
 */
export async function register() {
  // 仅 Node 运行时执行(排除 edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // 动态 import 收敛在 nodejs 分支内
  const [{ autoBackup }, { DEFAULT_DB_PATH }, path, fs] = await Promise.all([
    import("@/server/auto-backup"),
    import("@/server/db"),
    import("node:path"),
    import("node:fs"),
  ]);

  const BACKUP_DIR = path.join(path.dirname(DEFAULT_DB_PATH), "backups");

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
