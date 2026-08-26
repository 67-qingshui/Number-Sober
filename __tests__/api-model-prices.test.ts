import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { GET, POST } from "@/app/api/model-prices/route";
import { DELETE } from "@/app/api/model-prices/[model]/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("模型单价 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("POST 新增单价返回 201", async () => {
    const res = await POST(
      new Request("http://localhost/api/model-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-chat",
          inputPrice: 0.27,
          outputPrice: 1.1,
          cacheHitPrice: 0.07,
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).inputPrice).toBe(0.27);
  });

  it("POST 负数单价返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/model-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "m", inputPrice: -1, outputPrice: 1 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET 返回单价列表,DELETE 删除", async () => {
    await POST(
      new Request("http://localhost/api/model-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "deepseek-chat", inputPrice: 0.27, outputPrice: 1.1 }),
      }),
    );
    expect((await GET()).status).toBe(200);
    expect(await (await GET()).json()).toHaveLength(1);

    const res = await DELETE(
      new Request("http://localhost/api/model-prices/deepseek-chat", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ model: "deepseek-chat" }) },
    );
    expect(res.status).toBe(200);
    expect(await (await GET()).json()).toHaveLength(0);
  });
});
