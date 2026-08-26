import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addConsumption } from "@/server/points";
import {
  settleDuePoints,
  getBalance,
} from "@/server/points-settle";

describe("延迟到账与余额", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "ps.db");
  });

  it("到期前:可用=立即部分,待入账=延迟部分", () => {
    addConsumption(
      {
        date: "2026-08-25",
        description: "购物",
        amount: 10000,
        rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
      },
      dbFile,
    );
    const bal = getBalance(dbFile);
    expect(bal.available).toBe(100);
    expect(bal.pending).toBe(400);
  });

  it("到期结算后延迟积分变为可用", () => {
    addConsumption(
      {
        date: "2026-08-25",
        description: "购物",
        amount: 10000,
        rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
      },
      dbFile,
    );
    // 模拟时间推进:直接结算(available_at <= now)
    const settled = settleDuePoints(new Date("2026-09-25"), dbFile);
    expect(settled).toBe(400); // 结算的积分数量
    const bal = getBalance(dbFile);
    expect(bal.available).toBe(500);
    expect(bal.pending).toBe(0);
  });

  it("未到期时结算数量为 0", () => {
    addConsumption(
      {
        date: "2026-08-25",
        description: "x",
        amount: 1000,
        rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
      },
      dbFile,
    );
    expect(settleDuePoints(new Date("2026-08-26"), dbFile)).toBe(0);
  });

  it("多条目混合结算只处理已到期部分", () => {
    addConsumption(
      { date: "2026-07-01", description: "a", amount: 10000, rule: { ratePct: 5, immediatePct: 20, delayDays: 30 } },
      dbFile,
    );
    addConsumption(
      { date: "2026-08-20", description: "b", amount: 20000, rule: { ratePct: 10, immediatePct: 50, delayDays: 30 } },
      dbFile,
    );
    // a:总 500,立即 100,延迟 400 于 07-31 到期
    // b:总 2000,立即 1000,延迟 1000 于 09-19 到期
    const settled = settleDuePoints(new Date("2026-09-01"), dbFile);
    expect(settled).toBe(400);
    const bal = getBalance(dbFile);
    expect(bal.available).toBe(100 + 1000 + 400);
    expect(bal.pending).toBe(1000);
  });
});
