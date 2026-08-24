import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createPerson } from "@/server/persons";
import { createSession } from "@/server/session";
import { POST as postBill } from "@/app/api/aa/bills/route";
import { GET, PUT } from "@/app/api/aa/bills/[id]/route";
import { GET as getSettlement } from "@/app/api/aa/bills/[id]/settlement/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("AA 账单详情 API", () => {
  let alice: string;

  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    alice = createPerson({ name: "Alice" }).id;
    mockToken = createSession();
  });

  async function createOne() {
    const res = await postBill(
      new Request("http://localhost/api/aa/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "聚餐",
          date: "2026-08-25",
          payerId: alice,
          items: [
            { description: "晚餐", amount: 4000, participants: [alice] },
          ],
        }),
      }),
    );
    return (await res.json()) as { id: string };
  }

  it("GET 返回完整详情(含条目)", async () => {
    const { id } = await createOne();
    const res = await GET(new Request("http://localhost/api/aa/bills/" + id), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const bill = await res.json();
    expect(bill.items).toHaveLength(1);
    expect(bill.total).toBe(4000);
  });

  it("GET 不存在的账单返回 404", async () => {
    const res = await GET(
      new Request("http://localhost/api/aa/bills/no-such"),
      { params: Promise.resolve({ id: "no-such" }) },
    );
    expect(res.status).toBe(404);
  });

  it("PUT 更新条目并重算总额", async () => {
    const { id } = await createOne();
    const res = await PUT(
      new Request(`http://localhost/api/aa/bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { description: "晚餐", amount: 4000, participants: [alice] },
            { description: "加菜", amount: 1000, participants: [alice] },
          ],
        }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
    const bill = await res.json();
    expect(bill.total).toBe(5000);
    expect(bill.items).toHaveLength(2);
  });

  it("PUT 空条目返回 400", async () => {
    const { id } = await createOne();
    const res = await PUT(
      new Request(`http://localhost/api/aa/bills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(400);
  });

  it("GET settlement 返回应还/应收摘要", async () => {
    const bob = createPerson({ name: "Bob" }).id;
    const res = await postBill(
      new Request("http://localhost/api/aa/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "聚餐",
          date: "2026-08-25",
          payerId: alice,
          items: [
            { description: "晚餐", amount: 4000, participants: [alice, bob] },
          ],
        }),
      }),
    );
    const { id } = (await res.json()) as { id: string };

    const sRes = await getSettlement(
      new Request(`http://localhost/api/aa/bills/${id}/settlement`),
      { params: Promise.resolve({ id }) },
    );
    expect(sRes.status).toBe(200);
    const s = await sRes.json();
    expect(s.total).toBe(4000);
    expect(s.receivable).toBe(2000);
  });

  it("GET settlement 不存在的账单返回 404", async () => {
    const res = await getSettlement(
      new Request("http://localhost/api/aa/bills/no-such/settlement"),
      { params: Promise.resolve({ id: "no-such" }) },
    );
    expect(res.status).toBe(404);
  });
});
