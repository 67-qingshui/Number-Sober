import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupAdmin, verifyPassword, changePassword } from "@/server/admin";

describe("修改密码", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "cp.db");
    setupAdmin("secret123", dbFile);
  });

  it("旧密码正确时改密成功,新密码可登录旧密码失效", () => {
    changePassword("secret123", "newpass456", dbFile);
    expect(verifyPassword("newpass456", dbFile)).toBe(true);
    expect(verifyPassword("secret123", dbFile)).toBe(false);
  });

  it("旧密码错误抛错且密码不变", () => {
    expect(() => changePassword("wrong", "newpass456", dbFile)).toThrow(
      /旧密码/,
    );
    expect(verifyPassword("secret123", dbFile)).toBe(true);
  });

  it("新密码太短抛错", () => {
    expect(() => changePassword("secret123", "ab", dbFile)).toThrow(/至少/);
  });
});
