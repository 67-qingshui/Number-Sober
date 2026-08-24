import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { createItem } from "@/server/items";
import { POST, GET } from "@/app/api/items/[id]/stock/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("库存 API", () => {
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
      name: "墨盒",
      category: "consumable",
      purchasePrice: 3000,
      purchaseDate: "2026-08-01",
      stock: 5,
    }).id;
  });

  it("POST 消耗库存返回 201,库存减少", async () => {
    const res = await POST(
      new Request(`http://localhost/api/items/${itemId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: -2, note: "打印" }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    expect(res.status).toBe(201);
    expect((await res.json()).delta).toBe(-2);
  });

  it("POST 库存不足返回 400", async () => {
    const res = await POST(
      new Request(`http://localhost/api/items/${itemId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: -10 }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    expect(res.status).toBe(400);
  });

  it("GET 返回变更记录", async () => {
    await POST(
      new Request(`http://localhost/api/items/${itemId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: -1 }),
      }),
      { params: Promise.resolve({ id: itemId }) },
    );
    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: itemId }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });
});
