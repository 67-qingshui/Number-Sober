import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createTokenEntry,
  listTokenEntries,
  getTokenStats,
  importTokenCsv,
} from "@/server/token-entries";

describe("Token 录入服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "t.db");
  });

  it("录入一条 Token 用量并持久化", () => {
    const entry = createTokenEntry(
      {
        date: "2026-08-25",
        provider: "deepseek",
        model: "deepseek-chat",
        inputTokens: 1000,
        cacheHitTokens: 200,
        outputTokens: 500,
        cost: 0.15,
      },
      dbFile,
    );
    expect(entry.id).toBeTruthy();
    expect(entry.inputTokens).toBe(1000);
    expect(listTokenEntries(dbFile)).toHaveLength(1);
  });

  it("缓存命中与成本可省略(默认 0)", () => {
    const entry = createTokenEntry(
      { date: "2026-08-25", provider: "x", model: "m", inputTokens: 100, outputTokens: 50 },
      dbFile,
    );
    expect(entry.cacheHitTokens).toBe(0);
    expect(entry.cost).toBe(0);
  });

  it("负数 token 抛错", () => {
    expect(() =>
      createTokenEntry(
        { date: "2026-08-25", provider: "x", model: "m", inputTokens: -1, outputTokens: 1 },
        dbFile,
      ),
    ).toThrow(/非负/);
  });

  it("负数成本抛错", () => {
    expect(() =>
      createTokenEntry(
        { date: "2026-08-25", provider: "x", model: "m", inputTokens: 1, outputTokens: 1, cost: -0.1 },
        dbFile,
      ),
    ).toThrow(/成本/);
  });

  it("空模型名抛错", () => {
    expect(() =>
      createTokenEntry(
        { date: "2026-08-25", provider: "x", model: "  ", inputTokens: 1, outputTokens: 1 },
        dbFile,
      ),
    ).toThrow(/模型/);
  });

  it("列表按日期倒序", () => {
    createTokenEntry(
      { date: "2026-08-01", provider: "x", model: "m", inputTokens: 1, outputTokens: 1 },
      dbFile,
    );
    createTokenEntry(
      { date: "2026-08-25", provider: "x", model: "m", inputTokens: 2, outputTokens: 2 },
      dbFile,
    );
    const list = listTokenEntries(dbFile);
    expect(list[0].date).toBe("2026-08-25");
  });

  it("统计汇总正确(总计/按天/按模型)", () => {
    createTokenEntry(
      { date: "2026-08-01", provider: "deepseek", model: "deepseek-chat", inputTokens: 1000, cacheHitTokens: 200, outputTokens: 500, cost: 0.15 },
      dbFile,
    );
    createTokenEntry(
      { date: "2026-08-01", provider: "deepseek", model: "deepseek-chat", inputTokens: 2000, outputTokens: 1000, cost: 0.3 },
      dbFile,
    );
    createTokenEntry(
      { date: "2026-08-02", provider: "openai", model: "gpt-4o", inputTokens: 500, cacheHitTokens: 100, outputTokens: 300, cost: 0.08 },
      dbFile,
    );
    const stats = getTokenStats(dbFile);
    expect(stats.totals.inputTokens).toBe(3500);
    expect(stats.totals.cost).toBeCloseTo(0.53);
    expect(stats.byDay).toHaveLength(2);
    expect(stats.byModel).toHaveLength(2);
  });

  it("CSV 批量导入成功", () => {
    const csv = [
      "date,provider,model,input_tokens,cache_hit_tokens,output_tokens,cost",
      "2026-08-01,deepseek,deepseek-chat,1000,200,500,0.15",
      "2026-08-02,x,m,100,,50,",
    ].join("\n");
    const result = importTokenCsv(csv, dbFile);
    expect(result.imported).toBe(2);
    expect(result.failedRows).toBe(0);
    expect(listTokenEntries(dbFile)).toHaveLength(2);
  });

  it("CSV 含非法行时跳过并计数", () => {
    const csv = [
      "date,provider,model,input_tokens,output_tokens",
      "2026-08-01,x,m,100,50",
      "2026-08-01,x,m,-5,50",
    ].join("\n");
    const result = importTokenCsv(csv, dbFile);
    expect(result.imported).toBe(1);
    expect(result.failedRows).toBe(1);
    expect(result.firstError).toContain("非负");
    expect(listTokenEntries(dbFile)).toHaveLength(1);
  });
});
