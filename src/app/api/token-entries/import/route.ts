import { NextResponse } from "next/server";
import { importTokenCsv } from "@/server/token-entries";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const csv = String(body.csv ?? "");
    if (!csv.trim())
      return NextResponse.json({ error: "CSV 内容不能为空" }, { status: 400 });
    const result = importTokenCsv(csv);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "导入失败" },
      { status: 400 },
    );
  }
}
