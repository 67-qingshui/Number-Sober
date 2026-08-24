import { NextResponse } from "next/server";
import { changeStock, listStockChanges } from "@/server/stock";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  return NextResponse.json(listStockChanges(id));
}

export async function POST(req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const change = changeStock({
      itemId: id,
      delta: Number(body.delta),
      note: body.note != null ? String(body.note) : undefined,
    });
    return NextResponse.json(change, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 400 },
    );
  }
}
