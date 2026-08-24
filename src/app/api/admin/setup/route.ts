import { NextResponse } from "next/server";
import { setupAdmin } from "@/server/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    setupAdmin(String(body.password ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "设置失败" },
      { status: 400 },
    );
  }
}
