import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addConsumption, listPointEntries } from "@/server/points";

describe("积分服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "pt.db");
  });

  it("消费返积分:立即可用 + 延迟到账", () => {
    const result = addConsumption(
      {
        date: "2026-08-25",
        description: "购物",
        amount: 10000,
        rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
      },
      dbFile,
    );
    expect(result.earnback).toEqual({ total: 500, immediate: 100, delayed: 400 });
    const entries = listPointEntries(dbFile);
    expect(entries).toHaveLength(2);
    // 立即部分 available_at 为空
    const immediate = entries.find((e) => e.availableAt === null)!;
    expect(immediate.amount).toBe(100);
    expect(immediate.kind).toBe("earn");
    // 延迟部分有到账时间
    const delayed = entries.find((e) => e.availableAt !== null)!;
    expect(delayed.amount).toBe(400);
    expect(delayed.availableAt!.startsWith("2026-09-24")).toBe(true);
  });

  it("延迟天数为 0 时只产生一条立即记录", () => {
    addConsumption(
      {
        date: "2026-08-25",
        description: "购物",
        amount: 10000,
        rule: { ratePct: 5, immediatePct: 0, delayDays: 0 },
      },
      dbFile,
    );
    const entries = listPointEntries(dbFile);
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(500);
    expect(entries[0].availableAt).toBeNull();
  });

  it("负数金额抛错且不写库", () => {
    expect(() =>
      addConsumption(
        {
          date: "2026-08-25",
          description: "x",
          amount: -100,
          rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
        },
        dbFile,
      ),
    ).toThrow();
    expect(listPointEntries(dbFile)).toHaveLength(0);
  });

  it("空日期抛错", () => {
    expect(() =>
      addConsumption(
        {
          date: "",
          description: "x",
          amount: 100,
          rule: { ratePct: 5, immediatePct: 20, delayDays: 30 },
        },
        dbFile,
      ),
    ).toThrow(/日期/);
  });
});
