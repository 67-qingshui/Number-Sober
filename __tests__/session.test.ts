import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSession, validateSession, destroySession } from "@/server/session";

describe("会话服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "s.db");
  });

  it("创建会话后 token 有效", () => {
    const token = createSession(dbFile);
    expect(token).toBeTruthy();
    expect(validateSession(token, dbFile)).toBe(true);
  });

  it("无效或空 token 无效", () => {
    expect(validateSession("no-such-token", dbFile)).toBe(false);
    expect(validateSession(undefined, dbFile)).toBe(false);
    expect(validateSession("", dbFile)).toBe(false);
  });

  it("销毁会话后失效", () => {
    const token = createSession(dbFile);
    destroySession(token, dbFile);
    expect(validateSession(token, dbFile)).toBe(false);
  });
});
