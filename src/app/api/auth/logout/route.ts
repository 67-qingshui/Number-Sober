import { NextResponse } from "next/server";
import { destroySession } from "@/server/session";

export const runtime = "nodejs";

function readSessionToken(req: Request): string | undefined {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const pair = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("ns_session="));
  return pair?.split("=")[1];
}

export async function POST(req: Request) {
  destroySession(readSessionToken(req));
  const res = NextResponse.json({ ok: true });
  res.cookies.set("ns_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
