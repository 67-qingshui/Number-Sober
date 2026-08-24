import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { GET, POST } from "@/app/api/items/route";
import { PATCH, DELETE } from "@/app/api/items/[id]/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("物品 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("POST 创建资产物品返回 201", async () => {
    const res = await POST(
      new Request("http://localhost/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "打印机",
          category: "asset",
          purchasePrice: 120000,
          purchaseDate: "2026-01-15",
          lifespanMonths: 24,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const item = await res.json();
    expect(item.name).toBe("打印机");
    expect(item.lifespanMonths).toBe(24);
  });

  it("POST 缺少寿命月数返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "打印机",
          category: "asset",
          purchasePrice: 120000,
          purchaseDate: "2026-01-15",
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET 返回物品列表", async () => {
    await POST(
      new Request("http://localhost/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "墨盒",
          category: "consumable",
          purchasePrice: 3000,
          purchaseDate: "2026-08-01",
          stock: 5,
        }),
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(1);
    expect(list[0].stock).toBe(5);
  });

  it("PATCH 更新物品,DELETE 删除物品", async () => {
    const created = await (
      await POST(
        new Request("http://localhost/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "打印机",
            category: "asset",
            purchasePrice: 120000,
            purchaseDate: "2026-01-15",
            lifespanMonths: 24,
          }),
        }),
      )
    ).json();

    const patched = await PATCH(
      new Request(`http://localhost/api/items/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "激光打印机" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patched.status).toBe(200);
    expect((await patched.json()).name).toBe("激光打印机");

    const deleted = await DELETE(
      new Request(`http://localhost/api/items/${created.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(deleted.status).toBe(200);
    expect(await (await GET()).json()).toHaveLength(0);
  });

  it("未登录返回 401", async () => {
    mockToken = "";
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
