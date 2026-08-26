import { describe, it, expect } from "vitest";
import { computeCost } from "@/lib/model-price";

const PRICE = { inputPrice: 1.0, outputPrice: 2.0, cacheHitPrice: 0.5 };

describe("Token 成本计算", () => {
  it("无 token 时成本为 0", () => {
    expect(computeCost(0, 0, 0, PRICE)).toBe(0);
  });

  it("按百万 token 单价计算", () => {
    // 1M input @ $1 = $1
    expect(computeCost(1_000_000, 0, 0, PRICE)).toBeCloseTo(1.0);
  });

  it("输入/缓存/输出分别计价后求和", () => {
    // 1M input @$1 + 1M cache @$0.5 + 2M output @$2 = 1 + 0.5 + 4 = 5.5
    expect(computeCost(1_000_000, 1_000_000, 2_000_000, PRICE)).toBeCloseTo(5.5);
  });

  it("零单价不影响其他项", () => {
    const price = { inputPrice: 0, outputPrice: 2.0, cacheHitPrice: 0.5 };
    expect(computeCost(1_000_000, 1_000_000, 1_000_000, price)).toBeCloseTo(2.5);
  });

  it("部分 token 按比例计算", () => {
    // 500k input @$1 = $0.5
    expect(computeCost(500_000, 0, 0, PRICE)).toBeCloseTo(0.5);
  });
});
