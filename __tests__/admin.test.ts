import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { hasAdmin, setupAdmin, verifyPassword } from "@/server/admin";

describe("管理员账号", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "a.db");
  });

  it("初始无管理员", () => {
    expect(hasAdmin(dbFile)).toBe(false);
  });

  it("设置管理员后存在", () => {
    setupAdmin("secret123", dbFile);
    expect(hasAdmin(dbFile)).toBe(true);
  });

  it("密码不存明文,以 salt:hash 形式存储", () => {
    setupAdmin("secret123", dbFile);
    const db = new Database(dbFile);
    const row = db
      .prepare("SELECT password_hash AS h FROM admin")
      .get() as { h: string };
    db.close();
    expect(row.h).not.toContain("secret123");
    expect(row.h).toContain(":");
  });

  it("正确密码通过验证,错误密码与空密码不通过", () => {
    setupAdmin("secret123", dbFile);
    expect(verifyPassword("secret123", dbFile)).toBe(true);
    expect(verifyPassword("wrong", dbFile)).toBe(false);
    expect(verifyPassword("", dbFile)).toBe(false);
  });

  it("已存在管理员时重复设置抛错", () => {
    setupAdmin("secret123", dbFile);
    expect(() => setupAdmin("other456", dbFile)).toThrow(/已存在/);
  });

  it("密码过短抛错", () => {
    expect(() => setupAdmin("12", dbFile)).toThrow(/至少/);
  });
});
