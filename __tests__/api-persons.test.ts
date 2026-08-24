import { describe, it, expect, beforeAll } from "vitest";
import { GET, POST } from "@/app/api/persons/route";
import { PATCH, DELETE } from "@/app/api/persons/[id]/route";

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

describe("参与人 API 详情(编辑/删除)", () => {
  async function createOne(name: string, note?: string) {
    const res = await POST(
      new Request("http://localhost/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, note }),
      }),
    );
    return (await res.json()) as { id: string; name: string };
  }

  it("PATCH 更新参与人姓名与备注", async () => {
    const p = await createOne("小明");
    const res = await PATCH(
      new Request(`http://localhost/api/persons/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "大明", note: "室友" }),
      }),
      { params: Promise.resolve({ id: p.id }) },
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.name).toBe("大明");
    expect(updated.note).toBe("室友");
  });

  it("PATCH 空姓名返回 400", async () => {
    const p = await createOne("小红");
    const res = await PATCH(
      new Request(`http://localhost/api/persons/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  " }),
      }),
      { params: Promise.resolve({ id: p.id }) },
    );
    expect(res.status).toBe(400);
  });

  it("DELETE 删除参与人后列表不含该人", async () => {
    const p = await createOne("小刚");
    const res = await DELETE(
      new Request(`http://localhost/api/persons/${p.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: p.id }) },
    );
    expect(res.status).toBe(200);
    const list = (await (await GET()).json()) as { id: string }[];
    expect(list.some((x) => x.id === p.id)).toBe(false);
  });

  it("DELETE 不存在的参与人返回 404", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/persons/no-such-id", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "no-such-id" }) },
    );
    expect(res.status).toBe(404);
  });
});
