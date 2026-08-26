import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { GET, POST } from "@/app/api/points/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("积分 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("POST 消费返积分返回 201 与拆分明细", async () => {
    const res = await POST(
      new Request("http://localhost/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-08-25",
          description: "购物",
          amount: 10000,
          rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
        }),
      }),
    );
    expect(res.status).toBe(201);
    const d = await res.json();
    expect(d.earnback.total).toBe(500);
    expect(d.earnback.immediate).toBe(100);
  });

  it("POST 负数金额返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-08-25",
          description: "x",
          amount: -100,
          rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET 返回积分条目列表", async () => {
    await POST(
      new Request("http://localhost/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-08-25",
          description: "购物",
          amount: 10000,
          rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
        }),
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(2);
  });
});
