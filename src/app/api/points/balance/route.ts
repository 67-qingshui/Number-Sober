import { NextResponse } from "next/server";
import { getBalance, settleDuePoints } from "@/server/points-settle";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(getBalance());
}

export async function POST() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  const settled = settleDuePoints(new Date());
  return NextResponse.json({ settled, balance: getBalance() });
}
