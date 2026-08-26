import { NextResponse } from "next/server";
import {
  upsertModelPrice,
  listModelPrices,
} from "@/server/model-prices";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(listModelPrices());
}

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const row = upsertModelPrice({
      model: String(body.model ?? ""),
      inputPrice: Number(body.inputPrice),
      outputPrice: Number(body.outputPrice),
      cacheHitPrice:
        body.cacheHitPrice != null ? Number(body.cacheHitPrice) : undefined,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 400 },
    );
  }
}
