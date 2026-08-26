import { NextResponse } from "next/server";
import { adjustPoints } from "@/server/points-adjust";
import { getBalance } from "@/server/points-settle";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (amount > 0) {
      adjustPoints({
        date: String(body.date ?? ""),
        description: String(body.description ?? ""),
        amount,
      });
    } else {
      // 负数调整走 redeem 通道(转出语义)
      adjustPoints({
        date: String(body.date ?? ""),
        description: String(body.description ?? ""),
        amount,
      });
    }
    return NextResponse.json({ balance: getBalance() }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 400 },
    );
  }
}
