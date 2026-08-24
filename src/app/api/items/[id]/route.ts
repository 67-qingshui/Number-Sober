import { NextResponse } from "next/server";
import { updateItem, deleteItem } from "@/server/items";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const item = updateItem(id, {
      name: body.name != null ? String(body.name) : undefined,
      lifespanMonths:
        body.lifespanMonths != null ? Number(body.lifespanMonths) : undefined,
      stock: body.stock != null ? Number(body.stock) : undefined,
    });
    return NextResponse.json(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "更新失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    deleteItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "删除失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
