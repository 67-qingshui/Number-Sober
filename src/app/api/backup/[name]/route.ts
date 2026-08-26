import { NextResponse } from "next/server";
import { importBackup, verifyBackup } from "@/server/backup";
import { DEFAULT_DB_PATH } from "@/server/db";
import { requireAuth } from "@/server/auth-guard";
import path from "node:path";
import fs from "node:fs";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ name: string }>;
}

function backupDir(): string {
  return process.env.NS_BACKUP_DIR && fs.existsSync(process.env.NS_BACKUP_DIR)
    ? process.env.NS_BACKUP_DIR
    : path.join(path.dirname(DEFAULT_DB_PATH), "backups");
}

export async function POST(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { name } = await ctx.params;
  // 只允许文件名,防止路径穿越
  if (name.includes("/") || name.includes("\\") || name.includes(".."))
    return NextResponse.json({ error: "非法文件名" }, { status: 400 });
  const src = path.join(backupDir(), decodeURIComponent(name));
  if (!verifyBackup(src))
    return NextResponse.json({ error: "备份不存在或无效" }, { status: 404 });
  try {
    importBackup(src);
    return NextResponse.json({
      ok: true,
      note: "已还原,重启应用后完全生效",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "还原失败" },
      { status: 500 },
    );
  }
}
