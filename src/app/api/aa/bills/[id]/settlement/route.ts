import { NextResponse } from "next/server";
import { getSettlement } from "@/server/aa";
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
    return NextResponse.json(getSettlement(id));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "未找到" },
      { status: 404 },
    );
  }
}
