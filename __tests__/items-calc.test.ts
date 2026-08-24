import { describe, it, expect } from "vitest";
import { monthlyDepreciation, depreciatedValue } from "@/lib/items";

describe("摊销计算", () => {
  it("月摊销 = 价格 ÷ 寿命月数(向上取整)", () => {
    expect(monthlyDepreciation(120000, 12)).toBe(10000);
    expect(monthlyDepreciation(1000, 3)).toBe(334);
  });

  it("寿命月数为 0 或负数抛错", () => {
    expect(() => monthlyDepreciation(1000, 0)).toThrow();
    expect(() => monthlyDepreciation(1000, -1)).toThrow();
  });

  it("购买当月剩余价值 = 原价", () => {
    expect(depreciatedValue(120000, 12, 0)).toBe(120000);
  });

  it("按已过月数线性递减", () => {
    expect(depreciatedValue(120000, 12, 1)).toBe(110000);
    expect(depreciatedValue(120000, 12, 6)).toBe(60000);
  });

  it("摊销满后剩余价值钳制为 0,不为负", () => {
    expect(depreciatedValue(120000, 12, 12)).toBe(0);
    expect(depreciatedValue(120000, 12, 24)).toBe(0);
    expect(depreciatedValue(1000, 3, 3)).toBe(0);
  });

  it("剩余价值不超过原价(负数月数钳制)", () => {
    expect(depreciatedValue(120000, 12, -3)).toBe(120000);
  });
});
