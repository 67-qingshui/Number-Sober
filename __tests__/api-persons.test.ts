import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/persons/route";

describe("参与人 API", () => {
  beforeAll(async () => {
    // 清空隔离库中可能残留的数据
    await GET();
  });

  it("POST 创建参与人返回 201 与数据", async () => {
    const res = await POST(
      new Request("http://localhost/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "小明", note: "室友" }),
      }),
    );
    expect(res.status).toBe(201);
    const p = await res.json();
    expect(p.name).toBe("小明");
    expect(p.note).toBe("室友");
  });

  it("GET 返回参与人列表", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("POST 空姓名返回 400", async () => {
    const res = await POST(
      new Request("http://localhost/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
