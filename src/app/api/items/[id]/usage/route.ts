import { NextResponse } from "next/server";
import { addUsageRecord, listUsageRecords } from "@/server/usage";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  return NextResponse.json(listUsageRecords(id));
}

export async function POST(req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const rec = addUsageRecord({
      itemId: id,
      startAt: String(body.startAt ?? ""),
      endAt: String(body.endAt ?? ""),
      note: body.note != null ? String(body.note) : undefined,
    });
    return NextResponse.json(rec, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "添加失败" },
      { status: 400 },
    );
  }
}
