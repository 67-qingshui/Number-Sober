import { NextResponse } from "next/server";
import { getTokenStats } from "@/server/token-entries";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json(getTokenStats());
}
