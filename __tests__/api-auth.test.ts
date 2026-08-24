import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { POST as postLogin } from "@/app/api/auth/login/route";
import { POST as postLogout } from "@/app/api/auth/logout/route";

function loginReq(password: string) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("认证 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
  });

  it("错误密码返回 401", async () => {
    const res = await postLogin(loginReq("wrong"));
    expect(res.status).toBe(401);
  });

  it("正确密码返回 200 并写入 ns_session cookie", async () => {
    const res = await postLogin(loginReq("secret123"));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("ns_session=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("登出返回 200 并清除 cookie", async () => {
    const loginRes = await postLogin(loginReq("secret123"));
    const setCookie = loginRes.headers.get("set-cookie") ?? "";
    const token = setCookie.split(";")[0].split("=")[1];

    const res = await postLogout(
      new Request("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { Cookie: `ns_session=${token}` },
      }),
    );
    expect(res.status).toBe(200);
    const cleared = res.headers.get("set-cookie") ?? "";
    expect(cleared).toContain("ns_session=");
    expect(cleared.toLowerCase()).toContain("max-age=0");
  });
});
