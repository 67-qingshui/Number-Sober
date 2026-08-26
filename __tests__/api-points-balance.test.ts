import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { addConsumption } from "@/server/points";
import { GET, POST } from "@/app/api/points/balance/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("积分余额 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("GET 返回可用与待入账余额", async () => {
    addConsumption({
      date: "2026-08-25",
      description: "购物",
      amount: 10000,
      rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const bal = await res.json();
    expect(bal.available).toBe(100);
    expect(bal.pending).toBe(400);
  });

  it("POST 执行到期结算并返回新余额", async () => {
    addConsumption({
      date: "2026-08-25",
      description: "购物",
      amount: 10000,
      rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
    });
    const res = await POST();
    expect(res.status).toBe(200);
    const d = await res.json();
    // 2026-08-25 +30 天未到,结算 0
    expect(d.settled).toBe(0);
    expect(d.balance.pending).toBe(400);
  });
});
