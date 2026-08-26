import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupAdmin } from "@/server/admin";
import { createPerson } from "@/server/persons";
import { createBill, settleBill } from "@/server/aa";
import { createItem } from "@/server/items";
import { addConsumption } from "@/server/points";
import { getOverview } from "@/server/overview";

describe("总览仪表盘", () => {
  let dbFile: string;
  let alice: string;
  let bob: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "ov.db");
    setupAdmin("secret123", dbFile);
    alice = createPerson({ name: "Alice" }, dbFile).id;
    bob = createPerson({ name: "Bob" }, dbFile).id;
  });

  it("空库返回全零总览", () => {
    const o = getOverview(dbFile);
    expect(o.openBills).toBe(0);
    expect(o.receivableTotal).toBe(0);
    expect(o.personCount).toBe(2); // 参与人已建
    expect(o.points.available).toBe(0);
    expect(o.items.assetValue).toBe(0);
  });

  it("未结算账单数与应收合计", () => {
    const b1 = createBill(
      { title: "聚餐", date: "2026-08-25", payerId: alice, items: [{ description: "晚餐", amount: 4000, participants: [alice, bob] }] },
      dbFile,
    );
    createBill(
      { title: "打车", date: "2026-08-26", payerId: bob, items: [{ description: "车费", amount: 2000, participants: [alice, bob] }] },
      dbFile,
    );
    let o = getOverview(dbFile);
    expect(o.openBills).toBe(2);
    expect(o.receivableTotal).toBe(3000); // b1 Alice 应收 2000 + b2 Bob 应收 1000
    // 结算一单后
    settleBill(b1.id, dbFile);
    o = getOverview(dbFile);
    expect(o.openBills).toBe(1);
  });

  it("积分余额与物品价值", () => {
    addConsumption(
      { date: "2026-08-25", description: "购物", amount: 10000, rule: { ratePct: 5, immediatePct: 20, delayDays: 30 } },
      dbFile,
    );
    createItem(
      { name: "打印机", category: "asset", purchasePrice: 120000, purchaseDate: "2026-01-15", lifespanMonths: 24 },
      dbFile,
    );
    const o = getOverview(dbFile);
    expect(o.points.available).toBe(100);
    expect(o.points.pending).toBe(400);
    expect(o.items.assetValue).toBeGreaterThan(0);
    expect(o.items.count).toBe(1);
  });
});
