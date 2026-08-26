import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addConsumption } from "@/server/points";
import {
  adjustPoints,
  transferPoints,
} from "@/server/points-adjust";
import { getBalance } from "@/server/points-settle";

describe("手动调整与转账", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "pa.db");
    addConsumption(
      {
        date: "2026-08-25",
        description: "购物",
        amount: 10000,
        rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
      },
      dbFile,
    );
    // 可用 100
  });

  it("正调整增加可用余额", () => {
    adjustPoints({ date: "2026-08-26", description: "活动补偿", amount: 200 }, dbFile);
    expect(getBalance(dbFile).available).toBe(300);
  });

  it("负调整减少可用余额,不足时抛错", () => {
    adjustPoints({ date: "2026-08-26", description: "修正", amount: -30 }, dbFile);
    expect(getBalance(dbFile).available).toBe(70);
    expect(() =>
      adjustPoints({ date: "2026-08-26", description: "x", amount: -999 }, dbFile),
    ).toThrow(/不足/);
  });

  it("零调整抛错", () => {
    expect(() =>
      adjustPoints({ date: "2026-08-26", description: "x", amount: 0 }, dbFile),
    ).toThrow();
  });

  it("转账 = 负调整 + 正调整两条记录", () => {
    transferPoints(
      { date: "2026-08-26", description: "转出给朋友", amount: 40 },
      dbFile,
    );
    const bal = getBalance(dbFile);
    expect(bal.available).toBe(60); // 本账户 -40
  });

  it("转账金额超过可用余额抛错", () => {
    expect(() =>
      transferPoints({ date: "2026-08-26", description: "x", amount: 500 }, dbFile),
    ).toThrow(/不足/);
  });
});
