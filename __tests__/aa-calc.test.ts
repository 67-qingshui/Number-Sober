import { describe, it, expect } from "vitest";
import {
  splitEqual,
  splitByRatio,
  validateAmountShares,
  computeSettlement,
} from "@/lib/aa";

describe("均分算法", () => {
  it("整除时每人份额相等", () => {
    expect(splitEqual(100, 4)).toEqual([25, 25, 25, 25]);
  });

  it("余数分配给前面的人,总和保持等于总额", () => {
    expect(splitEqual(101, 4)).toEqual([26, 25, 25, 25]);
    expect(splitEqual(101, 4).reduce((a, b) => a + b, 0)).toBe(101);
  });

  it("总额小于人数时仍保持总和", () => {
    const shares = splitEqual(3, 5);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(3);
    expect(shares.every((s) => s >= 0)).toBe(true);
  });

  it("零金额返回全零份额", () => {
    expect(splitEqual(0, 3)).toEqual([0, 0, 0]);
  });

  it("参与人数为 0 抛错", () => {
    expect(() => splitEqual(100, 0)).toThrow();
  });
});

describe("比例分摊(权重,最大余数法)", () => {
  it("按权重比例分配", () => {
    expect(splitByRatio(5000, [3, 2])).toEqual([3000, 2000]);
  });

  it("不能整除时总和仍等于金额", () => {
    const shares = splitByRatio(5001, [3, 2]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(5001);
    expect(shares).toEqual([3001, 2000]);
  });

  it("多参与者权重分配", () => {
    expect(splitByRatio(1000, [1, 1, 2])).toEqual([250, 250, 500]);
  });

  it("权重全为 0 抛错", () => {
    expect(() => splitByRatio(100, [0, 0])).toThrow();
  });

  it("权重含负数抛错", () => {
    expect(() => splitByRatio(100, [1, -1])).toThrow();
  });
});

describe("自定义金额校验", () => {
  it("份额和等于金额时通过", () => {
    expect(() => validateAmountShares(5000, [3000, 2000])).not.toThrow();
  });

  it("份额和与金额不符抛错", () => {
    expect(() => validateAmountShares(5000, [3000, 1000])).toThrow(/合计/);
  });

  it("含负数或小数抛错", () => {
    expect(() => validateAmountShares(5000, [3000, 2000, -1])).toThrow();
    expect(() => validateAmountShares(5000, [3000.5, 1999.5])).toThrow();
  });

  it("空份额列表抛错", () => {
    expect(() => validateAmountShares(5000, [])).toThrow();
  });
});

describe("结算计算(应还/应收)", () => {
  const bill = (payerId: string, shares: [string, number][][]) => ({
    payerId,
    items: shares.map((parts) => ({
      participants: parts.map(([personId, share]) => ({ personId, share })),
    })),
  });

  it("两人均分:非垫付人应还,垫付人应收合计正确", () => {
    const s = computeSettlement(
      bill("a", [
        [
          ["a", 2000],
          ["b", 2000],
        ],
      ]),
    );
    expect(s.total).toBe(4000);
    const a = s.obligations.find((o) => o.personId === "a")!;
    const b = s.obligations.find((o) => o.personId === "b")!;
    expect(a.owed).toBe(2000);
    expect(a.net).toBe(-2000); // 垫付人:应收
    expect(b.net).toBe(2000); // 应还
    expect(s.receivable).toBe(2000);
  });

  it("多人多条目:净额之和恒为 0", () => {
    const s = computeSettlement(
      bill("a", [
        [
          ["a", 3000],
          ["b", 2000],
          ["c", 1000],
        ],
        [
          ["a", 500],
          ["b", 500],
        ],
      ]),
    );
    expect(s.total).toBe(7000);
    const sum = s.obligations.reduce((acc, o) => acc + o.net, 0);
    expect(sum).toBe(0);
    expect(s.receivable).toBe(7000 - 3500); // 垫付人 a 应付 3500,应收 3500
  });

  it("垫付人未参与任何条目:应收整单", () => {
    const s = computeSettlement(
      bill("a", [
        [
          ["b", 3000],
          ["c", 1000],
        ],
      ]),
    );
    const a = s.obligations.find((o) => o.personId === "a")!;
    expect(a.net).toBe(-4000);
    expect(s.receivable).toBe(4000);
  });

  it("单人账单:无他人负债", () => {
    const s = computeSettlement(
      bill("a", [[["a", 500]]]),
    );
    expect(s.obligations).toHaveLength(1);
    expect(s.obligations[0].net).toBe(0);
    expect(s.receivable).toBe(0);
  });
});
