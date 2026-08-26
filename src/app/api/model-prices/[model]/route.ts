import { NextResponse } from "next/server";
import { deleteModelPrice } from "@/server/model-prices";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ model: string }>;
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { model } = await ctx.params;
  deleteModelPrice(decodeURIComponent(model));
  return NextResponse.json({ ok: true });
}
