import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createPerson } from "@/server/persons";
import { createSession } from "@/server/session";
import { GET, POST } from "@/app/api/aa/bills/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("AA 账单 API", () => {
  let alice: string;
  let bob: string;

  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    alice = createPerson({ name: "Alice" }).id;
    bob = createPerson({ name: "Bob" }).id;
    mockToken = createSession();
  });

  it("未登录返回 401", async () => {
    mockToken = "";
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST 创建账单返回 201", async () => {
    const res = await POST(
      new Request("http://localhost/api/aa/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "聚餐",
          date: "2026-08-25",
          payerId: alice,
          items: [
            {
              description: "晚餐",
              amount: 4000,
              participants: [alice, bob],
            },
          ],
        }),
      }),
    );
    expect(res.status).toBe(201);
    const bill = await res.json();
    expect(bill.total).toBe(4000);
  });

  it("GET 返回账单列表", async () => {
    await POST(
      new Request("http://localhost/api/aa/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "聚餐",
          date: "2026-08-25",
          payerId: alice,
          items: [{ description: "晚餐", amount: 1000, participants: [alice] }],
        }),
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("聚餐");
  });

  it("POST 非法输入返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/aa/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", date: "2026-08-25", payerId: alice, items: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
