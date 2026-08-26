import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setupAdmin } from "@/server/admin";
import { createPerson } from "@/server/persons";
import { createSession } from "@/server/session";
import { POST as doExport, GET as listBackups } from "@/app/api/backup/route";
import { POST as doRestore } from "@/app/api/backup/[name]/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("备份 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
    createPerson({ name: "Alice" });
  });

  it("POST 导出备份并列入清单", async () => {
    const res = await doExport();
    expect(res.status).toBe(201);
    const exported = await res.json();
    expect(exported.size).toBeGreaterThan(0);

    const list = await listBackups();
    const backups = (await list.json()).backups;
    expect(backups.length).toBeGreaterThan(0);
  });

  it("POST restore 从备份还原", async () => {
    await doExport();
    const list = await listBackups();
    const backups = (await list.json()).backups;
    const name = encodeURIComponent(backups[0].name);

    // 还原(备份内容与当前一致,验证流程可执行)
    const res = await doRestore(
      new Request(`http://localhost/api/backup/${name}`, { method: "POST" }),
      { params: Promise.resolve({ name }) },
    );
    expect(res.status).toBe(200);
    // 还原后文件恢复为合法 SQLite
    const head = fs
      .readFileSync(process.env.NS_DB_PATH!)
      .subarray(0, 15)
      .toString();
    expect(head).toBe("SQLite format 3");
  });

  it("restore 非法文件名返回 400", async () => {
    const name = encodeURIComponent("../evil.db");
    const res = await doRestore(
      new Request(`http://localhost/api/backup/${name}`, { method: "POST" }),
      { params: Promise.resolve({ name }) },
    );
    expect(res.status).toBe(400);
  });
});
