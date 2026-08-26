import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import { setupAdmin } from "@/server/admin";
import { createSession } from "@/server/session";
import { GET as listEntries } from "@/app/api/token-entries/route";
import { POST as importCsv } from "@/app/api/token-entries/import/route";

let mockToken = "";
vi.mock("next/headers", () => ({
  cookies: () => ({ get: () => ({ value: mockToken }) }),
}));

describe("Token CSV 导入 API", () => {
  beforeEach(() => {
    try {
      fs.unlinkSync(process.env.NS_DB_PATH!);
    } catch {
      /* 忽略 */
    }
    setupAdmin("secret123");
    mockToken = createSession();
  });

  it("导入合法 CSV 返回计数", async () => {
    const res = await importCsv(
      new Request("http://localhost/api/token-entries/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: "date,provider,model,input_tokens,output_tokens\n2026-08-01,x,m,100,50",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      imported: 1,
      failedRows: 0,
      firstError: null,
    });
    const list = await (await listEntries()).json();
    expect(list).toHaveLength(1);
  });

  it("空 CSV 返回 400", async () => {
    const res = await importCsv(
      new Request("http://localhost/api/token-entries/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("部分失败行返回计数与首个错误", async () => {
    const res = await importCsv(
      new Request("http://localhost/api/token-entries/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: "date,provider,model,input_tokens,output_tokens\n2026-08-01,x,m,100,50\n2026-08-01,x,m,-5,50",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.imported).toBe(1);
    expect(result.failedRows).toBe(1);
    expect(result.firstError).toContain("非负");
  });
});
