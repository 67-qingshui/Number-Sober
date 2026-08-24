import { NextResponse } from "next/server";
import { settleBill } from "@/server/aa";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_req: Request, ctx: RouteContext) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    return NextResponse.json(settleBill(id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "操作失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
