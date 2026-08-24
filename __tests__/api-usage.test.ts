import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { createItem } from "@/server/items";
import { POST as postItem } from "@/app/api/items/route";
import { GET, POST } from "@/app/api/items/[id]/usage/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("使用记录 API", () => {
  let itemId: string;

  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
    itemId = createItem({
      name: "打印机",
      category: "asset",
      purchasePrice: 120000,
      purchaseDate: "2026-01-15",
      lifespanMonths: 24,
    }).id;
  });

  it("POST 添加使用记录返回 201", async () => {
    const res = await POST(
      new Request(`http://localhost/api/items/${itemId}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: "2026-08-01T10:00:00",
          endAt: "2026-08-01T12:00:00",
          note: "打印",
        }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    expect(res.status).toBe(201);
    expect((await res.json()).note).toBe("打印");
  });

  it("POST 结束早于开始返回 400", async () => {
    const res = await POST(
      new Request(`http://localhost/api/items/${itemId}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: "2026-08-01T12:00:00",
          endAt: "2026-08-01T10:00:00",
        }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    expect(res.status).toBe(400);
  });

  it("GET 返回该物品的使用记录", async () => {
    await POST(
      new Request(`http://localhost/api/items/${itemId}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: "2026-08-01T10:00:00",
          endAt: "2026-08-01T11:00:00",
        }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: itemId }),
    });
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(1);
    expect(list[0].itemId).toBe(itemId);
  });

  it("POST 到不存在的物品返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/items/no-such/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: "2026-08-01T10:00:00",
          endAt: "2026-08-01T11:00:00",
        }),
      }),
      { params: Promise.resolve({ id: "no-such" }) },
    );
    expect(res.status).toBe(400);
  });
});
