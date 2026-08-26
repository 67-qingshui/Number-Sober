import { NextResponse } from "next/server";
import { redeemPoints } from "@/server/points-redeem";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const balance = redeemPoints({
      date: String(body.date ?? ""),
      description: String(body.description ?? ""),
      amount: Number(body.amount),
    });
    return NextResponse.json({ balance }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "抵扣失败" },
      { status: 400 },
    );
  }
}
