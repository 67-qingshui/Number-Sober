import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { GET, POST } from "@/app/api/token-entries/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("Token 录入 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("POST 录入返回 201", async () => {
    const res = await POST(
      new Request("http://localhost/api/token-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-08-25",
          provider: "deepseek",
          model: "deepseek-chat",
          inputTokens: 1000,
          cacheHitTokens: 200,
          outputTokens: 500,
          cost: 0.15,
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).inputTokens).toBe(1000);
  });

  it("POST 负数 token 返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/token-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-08-25",
          provider: "x",
          model: "m",
          inputTokens: -1,
          outputTokens: 1,
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET 返回录入列表", async () => {
    await POST(
      new Request("http://localhost/api/token-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-08-25",
          provider: "x",
          model: "m",
          inputTokens: 100,
          outputTokens: 50,
        }),
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("未登录返回 401", async () => {
    mockToken = "";
    expect((await GET()).status).toBe(401);
  });
});
