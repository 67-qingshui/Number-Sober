import { describe, it, expect } from "vitest";
import { calcEarnback } from "@/lib/points";

describe("返积分计算", () => {
  const rule = { ratePct: 5, immediatePct: 20, delayDays: 30 };

  it("按比例计算总返现并拆分立即可用与延迟", () => {
    // 10000 × 5% = 500;500 × 20% = 100 立即,400 延迟
    expect(calcEarnback(10000, rule)).toEqual({
      total: 500,
      immediate: 100,
      delayed: 400,
    });
  });

  it("向下取整,不出小数积分", () => {
    // 999 × 5% = 49.95 → 49;49 × 20% = 9.8 → 9 立即,40 延迟
    expect(calcEarnback(999, rule)).toEqual({
      total: 49,
      immediate: 9,
      delayed: 40,
    });
  });

  it("delayDays 为 0 时全部立即到账", () => {
    expect(calcEarnback(10000, { ratePct: 5, immediatePct: 0, delayDays: 0 })).toEqual(
      { total: 500, immediate: 500, delayed: 0 },
    );
  });

  it("immediatePct 100 时全部立即", () => {
    expect(calcEarnback(10000, { ratePct: 5, immediatePct: 100, delayDays: 30 })).toEqual(
      { total: 500, immediate: 500, delayed: 0 },
    );
  });

  it("金额太小返现为 0", () => {
    expect(calcEarnback(5, rule)).toEqual({
      total: 0,
      immediate: 0,
      delayed: 0,
    });
  });

  it("非法比例抛错", () => {
    expect(() => calcEarnback(100, { ratePct: -1, immediatePct: 0, delayDays: 0 })).toThrow();
    expect(() => calcEarnback(100, { ratePct: 5, immediatePct: 101, delayDays: 0 })).toThrow();
  });

  it("负数金额抛错", () => {
    expect(() => calcEarnback(-1, rule)).toThrow();
  });
});
