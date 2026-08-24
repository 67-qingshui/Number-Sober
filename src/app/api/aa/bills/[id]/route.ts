import { NextResponse } from "next/server";
import { getBill, updateBillItems } from "@/server/aa";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    return NextResponse.json(getBill(id));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "未找到" },
      { status: 404 },
    );
  }
}

export async function PUT(req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const bill = updateBillItems(
      id,
      Array.isArray(body.items) ? body.items : [],
    );
    return NextResponse.json(bill);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
