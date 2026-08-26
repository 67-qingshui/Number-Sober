import { NextResponse } from "next/server";
import { exportBackup } from "@/server/backup";
import { DEFAULT_DB_PATH } from "@/server/db";
import { requireAuth } from "@/server/auth-guard";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const BACKUP_DIR =
  process.env.NS_BACKUP_DIR && fs.existsSync(process.env.NS_BACKUP_DIR)
    ? process.env.NS_BACKUP_DIR
    : path.join(path.dirname(DEFAULT_DB_PATH), "backups");

export async function POST() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(BACKUP_DIR, `number-sober-${stamp}.db`);
    const result = await exportBackup(dest);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "导出失败" },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    if (!fs.existsSync(BACKUP_DIR))
      return NextResponse.json({ backups: [] });
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith(".db"))
      .sort()
      .reverse()
      .map((f) => {
        const full = path.join(BACKUP_DIR, f);
        return {
          name: f,
          path: full,
          size: fs.statSync(full).size,
        };
      });
    return NextResponse.json({ backups: files });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "读取失败" },
      { status: 500 },
    );
  }
}
