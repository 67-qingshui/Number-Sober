import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/usage";

describe("使用时长格式化", () => {
  it("整小时显示 X小时0分", () => {
    expect(formatDuration("2026-08-01T10:00:00", "2026-08-01T12:00:00")).toBe(
      "2小时0分",
    );
  });

  it("小时+分钟", () => {
    expect(formatDuration("2026-08-01T10:00:00", "2026-08-01T11:30:00")).toBe(
      "1小时30分",
    );
  });

  it("不足一小时显示分钟", () => {
    expect(formatDuration("2026-08-01T10:00:00", "2026-08-01T10:45:00")).toBe(
      "45分",
    );
  });

  it("跨天计算正确", () => {
    expect(formatDuration("2026-08-01T22:00:00", "2026-08-02T01:00:00")).toBe(
      "3小时0分",
    );
  });

  it("结束早于开始抛错", () => {
    expect(() =>
      formatDuration("2026-08-01T12:00:00", "2026-08-01T10:00:00"),
    ).toThrow(/结束/);
  });
});
