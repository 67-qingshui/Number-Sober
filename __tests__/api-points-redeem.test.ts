import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { addConsumption } from "@/server/points";
import { POST } from "@/app/api/points/redeem/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("积分抵扣 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
    addConsumption({
      date: "2026-08-25",
      description: "购物",
      amount: 10000,
      rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
    });
  });

  it("POST 抵扣返回新余额", async () => {
    const res = await POST(
      new Request("http://localhost/api/points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-08-26", description: "抵咖啡", amount: 50 }),
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).balance.available).toBe(50);
  });

  it("POST 超额抵扣返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/points/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-08-26", description: "x", amount: 9999 }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("不足");
  });
});
