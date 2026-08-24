import { NextResponse } from "next/server";
import { createItem, listItems } from "@/server/items";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(listItems());
}

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();
    const item = createItem({
      name: String(body.name ?? ""),
      category: body.category === "consumable" ? "consumable" : "asset",
      purchasePrice: Number(body.purchasePrice),
      purchaseDate: String(body.purchaseDate ?? ""),
      lifespanMonths:
        body.lifespanMonths != null ? Number(body.lifespanMonths) : undefined,
      stock: body.stock != null ? Number(body.stock) : undefined,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "创建失败" },
      { status: 400 },
    );
  }
}
