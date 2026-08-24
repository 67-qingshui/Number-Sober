import { NextResponse } from "next/server";
import { updatePerson, deletePerson } from "@/server/persons";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const person = updatePerson(id, {
      name: String(body.name ?? ""),
      note: body.note != null ? String(body.note) : undefined,
    });
    return NextResponse.json(person);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "更新失败";
    const status = msg.includes("不存在") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  try {
    deletePerson(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "删除失败";
    const status = msg.includes("不存在") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
