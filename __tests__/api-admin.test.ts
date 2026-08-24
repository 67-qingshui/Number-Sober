import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import { GET as getStatus } from "@/app/api/admin/status/route";
import { POST as postSetup } from "@/app/api/admin/setup/route";

function setupReq(password: string) {
  return new Request("http://localhost/api/admin/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("管理员 API", () => {
  beforeEach(() => {
    // 每个测试前重置隔离库,保证独立
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 不存在则忽略 */
    }
  });

  it("初始状态 hasAdmin=false", async () => {
    const res = await getStatus();
    expect(res.status).toBe(200);
    expect((await res.json()).hasAdmin).toBe(false);
  });

  it("设置密码后 hasAdmin=true", async () => {
    const res = await postSetup(setupReq("secret123"));
    expect(res.status).toBe(200);
    const status = await getStatus();
    expect((await status.json()).hasAdmin).toBe(true);
  });

  it("密码过短返回 400", async () => {
    const res = await postSetup(setupReq("12"));
    expect(res.status).toBe(400);
    const status = await getStatus();
    expect((await status.json()).hasAdmin).toBe(false);
  });

  it("重复设置返回 400", async () => {
    await postSetup(setupReq("secret123"));
    const res = await postSetup(setupReq("other456"));
    expect(res.status).toBe(400);
  });
});
