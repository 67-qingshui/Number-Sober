import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getHealth } from "@/server/health";
import { MIGRATIONS } from "@/server/migrate";

describe("系统健康状态", () => {
  it("对临时数据库返回已连接与 schema 版本", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "h.db");
    const h = getHealth(file);
    expect(h.dbConnected).toBe(true);
    expect(h.schemaVersion).toBe(String(MIGRATIONS.at(-1)!.version));
  });

  it("数据库不可用时返回未连接", () => {
    const h = getHealth("/nonexistent-dir-xyz/nope.db");
    expect(h.dbConnected).toBe(false);
  });
});
