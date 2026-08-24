import { NextResponse } from "next/server";
import { createTokenEntry, listTokenEntries } from "@/server/token-entries";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(listTokenEntries());
}

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const entry = createTokenEntry({
      date: String(body.date ?? ""),
      provider: String(body.provider ?? ""),
      model: String(body.model ?? ""),
      inputTokens: Number(body.inputTokens),
      cacheHitTokens:
        body.cacheHitTokens != null ? Number(body.cacheHitTokens) : undefined,
      outputTokens: Number(body.outputTokens),
      cost: body.cost != null ? Number(body.cost) : undefined,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "录入失败" },
      { status: 400 },
    );
  }
}
