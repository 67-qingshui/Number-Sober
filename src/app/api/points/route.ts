import { NextResponse } from "next/server";
import { addConsumption, listPointEntries } from "@/server/points";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(listPointEntries());
}

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const result = addConsumption({
      date: String(body.date ?? ""),
      description: String(body.description ?? ""),
      amount: Number(body.amount),
      rule: {
        ratePct: Number(body.rule?.ratePct ?? 0),
        immediatePct: Number(body.rule?.immediatePct ?? 0),
        delayDays: Number(body.rule?.delayDays ?? 0),
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "记录失败" },
      { status: 400 },
    );
  }
}
