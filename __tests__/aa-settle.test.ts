import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPerson } from "@/server/persons";
import { createBill, settleBill, unsettleBill, getBill } from "@/server/aa";

describe("AA 账单结算", () => {
  let dbFile: string;
  let alice: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "aa3.db");
    alice = createPerson({ name: "Alice" }, dbFile).id;
  });

  function createOne() {
    return createBill(
      {
        title: "聚餐",
        date: "2026-08-25",
        payerId: alice,
        items: [{ description: "晚餐", amount: 4000, participants: [alice] }],
      },
      dbFile,
    );
  }

  it("结算后状态为 settled 并记录时间", () => {
    const created = createOne();
    expect(created.status).toBe("open");
    const settled = settleBill(created.id, dbFile);
    expect(settled.status).toBe("settled");
    expect(settled.settledAt).toBeTruthy();
    expect(getBill(created.id, dbFile).status).toBe("settled");
  });

  it("已结算再结算抛错", () => {
    const created = createOne();
    settleBill(created.id, dbFile);
    expect(() => settleBill(created.id, dbFile)).toThrow(/已结算/);
  });

  it("反结算恢复 open 并清除时间", () => {
    const created = createOne();
    settleBill(created.id, dbFile);
    const reopened = unsettleBill(created.id, dbFile);
    expect(reopened.status).toBe("open");
    expect(reopened.settledAt).toBeNull();
  });

  it("未结算时反结算抛错", () => {
    const created = createOne();
    expect(() => unsettleBill(created.id, dbFile)).toThrow(/未结算/);
  });

  it("结算不存在的账单抛错", () => {
    expect(() => settleBill("no-such", dbFile)).toThrow(/不存在/);
  });
});
