import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getConfig, setConfig } from "@/server/config";

describe("系统配置服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "cf.db");
  });

  it("默认积分为 1 日元", () => {
    expect(getConfig("point_yen_rate", dbFile)).toBe("1");
  });

  it("未设置的键返回默认值", () => {
    expect(getConfig("nonexistent", dbFile)).toBe("");
  });

  it("设置后读取一致,可覆盖", () => {
    setConfig("point_yen_rate", "2", dbFile);
    expect(getConfig("point_yen_rate", dbFile)).toBe("2");
    setConfig("point_yen_rate", "5", dbFile);
    expect(getConfig("point_yen_rate", dbFile)).toBe("5");
  });

  it("空键名抛错", () => {
    expect(() => setConfig(" ", "1", dbFile)).toThrow(/键/);
  });
});
