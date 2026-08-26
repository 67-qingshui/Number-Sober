import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin, verifyPassword } from "@/server/admin";
import { createSession } from "@/server/session";
import { GET, POST } from "@/app/api/config/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("系统配置 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("GET 返回默认汇率 1", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).pointYenRate).toBe(1);
  });

  it("POST 更新汇率", async () => {
    const res = await POST(
      new Request("http://localhost/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointYenRate: 2.5 }),
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).pointYenRate).toBe(2.5);
  });

  it("POST 改密码后新密码生效", async () => {
    const res = await POST(
      new Request("http://localhost/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: "secret123", newPassword: "newpass456" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(verifyPassword("newpass456")).toBe(true);
  });

  it("POST 非正数汇率返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointYenRate: -1 }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
