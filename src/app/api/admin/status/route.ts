import { NextResponse } from "next/server";
import { hasAdmin } from "@/server/admin";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ hasAdmin: hasAdmin() });
}
