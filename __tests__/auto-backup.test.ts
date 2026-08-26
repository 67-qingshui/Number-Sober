import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupAdmin } from "@/server/admin";
import {
  autoBackup,
  pruneOldBackups,
  shouldBackup,
} from "@/server/auto-backup";

describe("定时自动备份", () => {
  let dbFile: string;
  let backupDir: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "ab.db");
    backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "ns-ab-"));
    setupAdmin("secret123", dbFile);
  });

  it("距上次备份超过间隔时应备份", () => {
    const last = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 小时前
    expect(shouldBackup(last, new Date(), 24)).toBe(true);
  });

  it("间隔内不重复备份", () => {
    const last = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 小时前
    expect(shouldBackup(last, new Date(), 24)).toBe(false);
  });

  it("从未备份过应备份(null)", () => {
    expect(shouldBackup(null, new Date(), 24)).toBe(true);
  });

  it("autoBackup 执行备份并记录时间戳文件", async () => {
    const result = await autoBackup({
      dbPath: dbFile,
      backupDir,
      intervalHours: 24,
      keepCount: 3,
    });
    expect(result.performed).toBe(true);
    expect(fs.existsSync(result.path!)).toBe(true);
    // 立即再跑一次,间隔内不再备份
    const again = await autoBackup({
      dbPath: dbFile,
      backupDir,
      intervalHours: 24,
      keepCount: 3,
    });
    expect(again.performed).toBe(false);
  });

  it("pruneOldBackups 只保留最近 N 个", async () => {
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(backupDir, `b-${i}.db`), "x");
      // 手动错开 mtime
      fs.utimesSync(
        path.join(backupDir, `b-${i}.db`),
        new Date(Date.now() - i * 60000),
        new Date(Date.now() - i * 60000),
      );
    }
    const removed = pruneOldBackups(backupDir, 3);
    expect(removed).toBe(2);
    const left = fs.readdirSync(backupDir);
    expect(left).toHaveLength(3);
    expect(left).toContain("b-0.db"); // 最新的留下
  });
});
