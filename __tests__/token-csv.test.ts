import { describe, it, expect } from "vitest";
import { parseTokenCsv } from "@/lib/token-csv";

describe("Token CSV 解析", () => {
  it("解析标准行(表头+数据)", () => {
    const csv = [
      "date,provider,model,input_tokens,cache_hit_tokens,output_tokens,cost",
      "2026-08-01,deepseek,deepseek-chat,1000,200,500,0.15",
    ].join("\n");
    const rows = parseTokenCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      date: "2026-08-01",
      provider: "deepseek",
      model: "deepseek-chat",
      inputTokens: 1000,
      cacheHitTokens: 200,
      outputTokens: 500,
      cost: 0.15,
    });
  });

  it("缓存命中与成本可省略(默认 0)", () => {
    const csv = [
      "date,provider,model,input_tokens,output_tokens",
      "2026-08-01,x,m,100,50",
    ].join("\n");
    const rows = parseTokenCsv(csv);
    expect(rows[0].cacheHitTokens).toBe(0);
    expect(rows[0].cost).toBe(0);
  });

  it("容忍 CRLF 与首尾空白", () => {
    const csv =
      "date,provider,model,input_tokens,output_tokens\r\n 2026-08-01 , x , m , 100 , 50 \r\n";
    const rows = parseTokenCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].date).toBe("2026-08-01");
    expect(rows[0].inputTokens).toBe(100);
  });

  it("空输入返回空数组", () => {
    expect(parseTokenCsv("")).toEqual([]);
    expect(parseTokenCsv("\n\n")).toEqual([]);
  });

  it("缺列或非法数字抛错并带行号", () => {
    expect(() =>
      parseTokenCsv(
        "date,provider,model,input_tokens,output_tokens\n2026-08-01,x",
      ),
    ).toThrow(/第 2 行/);
    expect(() =>
      parseTokenCsv(
        "date,provider,model,input_tokens,output_tokens\n2026-08-01,x,m,abc,50",
      ),
    ).toThrow(/第 2 行/);
  });
});
