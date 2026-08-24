import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPerson } from "@/server/persons";
import {
  createBill,
  getBill,
  updateBillItems,
  listBills,
} from "@/server/aa";

describe("AA 账单详情与条目管理", () => {
  let dbFile: string;
  let alice: string;
  let bob: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "aa2.db");
    alice = createPerson({ name: "Alice" }, dbFile).id;
    bob = createPerson({ name: "Bob" }, dbFile).id;
  });

  it("getBill 返回完整条目与参与人份额", () => {
    const created = createBill(
      {
        title: "聚餐",
        date: "2026-08-25",
        payerId: alice,
        items: [
          { description: "晚餐", amount: 4000, participants: [alice, bob] },
        ],
      },
      dbFile,
    );
    const bill = getBill(created.id, dbFile);
    expect(bill.title).toBe("聚餐");
    expect(bill.items).toHaveLength(1);
    expect(bill.items[0].participants).toEqual([
      { personId: alice, share: 2000 },
      { personId: bob, share: 2000 },
    ]);
    expect(bill.total).toBe(4000);
  });

  it("getBill 不存在的账单抛错", () => {
    expect(() => getBill("no-such", dbFile)).toThrow(/不存在/);
  });

  it("updateBillItems 替换条目并重算总额", () => {
    const created = createBill(
      {
        title: "聚餐",
        date: "2026-08-25",
        payerId: alice,
        items: [
          { description: "晚餐", amount: 4000, participants: [alice, bob] },
        ],
      },
      dbFile,
    );
    const updated = updateBillItems(
      created.id,
      [
        { description: "晚餐", amount: 4000, participants: [alice, bob] },
        { description: "加菜", amount: 1000, participants: [alice] },
      ],
      dbFile,
    );
    expect(updated.total).toBe(5000);
    expect(updated.items).toHaveLength(2);
    expect(getBill(created.id, dbFile).total).toBe(5000);
  });

  it("updateBillItems 空条目抛错", () => {
    const created = createBill(
      { title: "单", date: "2026-08-25", payerId: alice, items: [{ description: "a", amount: 100, participants: [alice] }] },
      dbFile,
    );
    expect(() => updateBillItems(created.id, [], dbFile)).toThrow(/条目/);
  });

  it("listBills 不包含条目明细(概要)", () => {
    const created = createBill(
      { title: "单", date: "2026-08-25", payerId: alice, items: [{ description: "a", amount: 100, participants: [alice] }] },
      dbFile,
    );
    const list = listBills(dbFile);
    expect(list[0].items).toEqual([]);
    expect(list[0].total).toBe(100);
    expect(getBill(created.id, dbFile).items).toHaveLength(1);
  });
});
