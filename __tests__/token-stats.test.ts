import { describe, it, expect } from "vitest";
import { aggregateByDay, aggregateByModel, totalStats } from "@/lib/token-stats";

const E = {
  a: {
    id: "a",
    date: "2026-08-01",
    provider: "deepseek",
    model: "deepseek-chat",
    inputTokens: 1000,
    cacheHitTokens: 200,
    outputTokens: 500,
    cost: 0.15,
    createdAt: "",
  },
  b: {
    id: "b",
    date: "2026-08-01",
    provider: "deepseek",
    model: "deepseek-chat",
    inputTokens: 2000,
    cacheHitTokens: 0,
    outputTokens: 1000,
    cost: 0.3,
    createdAt: "",
  },
  c: {
    id: "c",
    date: "2026-08-02",
    provider: "openai",
    model: "gpt-4o",
    inputTokens: 500,
    cacheHitTokens: 100,
    outputTokens: 300,
    cost: 0.08,
    createdAt: "",
  },
};

describe("Token 统计聚合", () => {
  it("按天聚合:同一天合并,不同天分开", () => {
    const rows = aggregateByDay([E.a, E.b, E.c]);
    expect(rows).toHaveLength(2);
    const d1 = rows.find((r) => r.key === "2026-08-01")!;
    expect(d1.inputTokens).toBe(3000);
    expect(d1.cacheHitTokens).toBe(200);
    expect(d1.outputTokens).toBe(1500);
    expect(d1.cost).toBeCloseTo(0.45);
  });

  it("按模型聚合", () => {
    const rows = aggregateByModel([E.a, E.b, E.c]);
    expect(rows).toHaveLength(2);
    const dc = rows.find((r) => r.key === "deepseek-chat")!;
    expect(dc.inputTokens).toBe(3000);
    expect(dc.cost).toBeCloseTo(0.45);
  });

  it("总计正确", () => {
    const total = totalStats([E.a, E.b, E.c]);
    expect(total.inputTokens).toBe(3500);
    expect(total.cacheHitTokens).toBe(300);
    expect(total.outputTokens).toBe(1800);
    expect(total.cost).toBeCloseTo(0.53);
  });

  it("空列表返回空聚合与零总计", () => {
    expect(aggregateByDay([])).toEqual([]);
    expect(aggregateByModel([])).toEqual([]);
    const total = totalStats([]);
    expect(total.inputTokens).toBe(0);
    expect(total.cost).toBe(0);
  });

  it("聚合结果按成本降序", () => {
    const rows = aggregateByDay([E.a, E.b, E.c]);
    expect(rows[0].key).toBe("2026-08-01"); // 0.45 > 0.08
  });
});
