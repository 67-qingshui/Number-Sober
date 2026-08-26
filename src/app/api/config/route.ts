import { NextResponse } from "next/server";
import { changePassword } from "@/server/admin";
import { getConfig, setConfig } from "@/server/config";
import { requireAuth } from "@/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  return NextResponse.json({
    pointYenRate: Number(getConfig("point_yen_rate")) || 1,
  });
}

export async function POST(req: Request) {
  if (!(await requireAuth()))
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await req.json();

    // 改密码(可选字段)
    if (body.newPassword) {
      changePassword(String(body.oldPassword ?? ""), String(body.newPassword));
    }

    // 积分汇率(可选字段)
    if (body.pointYenRate != null) {
      const rate = Number(body.pointYenRate);
      if (!Number.isFinite(rate) || rate <= 0)
        throw new Error("汇率必须是正数");
      setConfig("point_yen_rate", String(rate));
    }

    return NextResponse.json({
      ok: true,
      pointYenRate: Number(getConfig("point_yen_rate")) || 1,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 400 },
    );
  }
}
