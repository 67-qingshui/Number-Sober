import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addConsumption, listPointEntries } from "@/server/points";
import { redeemPoints } from "@/server/points-redeem";
import { getBalance } from "@/server/points-settle";

describe("积分抵扣", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "pr.db");
    addConsumption(
      {
        date: "2026-08-25",
        description: "购物",
        amount: 10000,
        rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
      },
      dbFile,
    );
    // 可用 100(立即),待入账 400
  });

  it("抵扣后可用余额减少并产生负数记录", () => {
    redeemPoints({ date: "2026-08-26", description: "抵咖啡", amount: 50 }, dbFile);
    const bal = getBalance(dbFile);
    expect(bal.available).toBe(50);
    const entries = listPointEntries(dbFile);
    const redeem = entries.find((e) => e.kind === "redeem");
    expect(redeem!.amount).toBe(-50);
  });

  it("抵扣金额超过可用余额抛错且不写库", () => {
    expect(() =>
      redeemPoints({ date: "2026-08-26", description: "x", amount: 200 }, dbFile),
    ).toThrow(/不足/);
    expect(getBalance(dbFile).available).toBe(100);
  });

  it("零或负数抵扣金额抛错", () => {
    expect(() =>
      redeemPoints({ date: "2026-08-26", description: "x", amount: 0 }, dbFile),
    ).toThrow();
    expect(() =>
      redeemPoints({ date: "2026-08-26", description: "x", amount: -5 }, dbFile),
    ).toThrow();
  });

  it("非正整数金额抛错", () => {
    expect(() =>
      redeemPoints({ date: "2026-08-26", description: "x", amount: 10.5 }, dbFile),
    ).toThrow(/整数/);
  });
});
