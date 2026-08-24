import { describe, it, expect } from "vitest";
import { splitEqual } from "@/lib/aa";

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
