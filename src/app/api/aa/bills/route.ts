import { NextResponse } from "next/server";
import { createBill, listBills } from "@/server/aa";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(listBills());
}

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const bill = createBill({
      title: String(body.title ?? ""),
      date: String(body.date ?? ""),
      payerId: String(body.payerId ?? ""),
      items: Array.isArray(body.items) ? body.items : [],
    });
    return NextResponse.json(bill, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "创建失败" },
      { status: 400 },
    );
  }
}
