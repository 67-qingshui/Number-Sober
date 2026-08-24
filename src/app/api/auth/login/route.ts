import { NextResponse } from "next/server";
import { verifyPassword } from "@/server/admin";
import { createSession } from "@/server/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = String(body.password ?? "");
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }
    const token = createSession();
    const res = NextResponse.json({ ok: true });
    res.cookies.set("ns_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
