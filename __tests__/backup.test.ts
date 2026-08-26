import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupAdmin } from "@/server/admin";
import { createPerson } from "@/server/persons";
import {
  exportBackup,
  importBackup,
  verifyBackup,
} from "@/server/backup";

describe("备份导出/导入", () => {
  let dbFile: string;
  let backupDir: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "bk.db");
    backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "ns-bk-"));
    setupAdmin("secret123", dbFile);
    createPerson({ name: "Alice" }, dbFile);
  });

  it("导出生成带元数据头的 SQLite 文件", async () => {
    const dest = path.join(backupDir, "backup.db");
    const result = await exportBackup(dest, dbFile);
    expect(result.path).toBe(dest);
    expect(result.size).toBeGreaterThan(0);
    // SQLite 文件头魔数
    const head = fs.readFileSync(dest).subarray(0, 15).toString();
    expect(head).toBe("SQLite format 3");
    // 元数据表存在
    expect(verifyBackup(dest)).toBe(true);
  });

  it("verifyBackup 对非 SQLite 文件返回 false", () => {
    const fake = path.join(backupDir, "fake.db");
    fs.writeFileSync(fake, "not a database");
    expect(verifyBackup(fake)).toBe(false);
  });

  it("verifyBackup 对不存在的文件返回 false", () => {
    expect(verifyBackup(path.join(backupDir, "no.db"))).toBe(false);
  });

  it("导入备份后数据恢复(人员存在)", async () => {
    const dest = path.join(backupDir, "backup.db");
    await exportBackup(dest, dbFile);

    // 准备一个空库作为还原目标
    const targetDb = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "ns-t-")),
      "t.db",
    );
    importBackup(dest, targetDb);

    const persons = await import("@/server/persons").then((m) =>
      m.listPersons(targetDb),
    );
    expect(persons.map((p) => p.name)).toEqual(["Alice"]);
  });

  it("导入非备份文件抛错", () => {
    const fake = path.join(backupDir, "fake.db");
    fs.writeFileSync(fake, "not a database");
    expect(() => importBackup(fake, dbFile)).toThrow(/备份/);
  });
});
