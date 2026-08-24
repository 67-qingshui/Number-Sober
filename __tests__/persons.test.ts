import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPerson, listPersons } from "@/server/persons";

describe("参与人服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "p.db");
  });

  it("创建参与人并持久化", () => {
    const p = createPerson({ name: "小明", note: "室友" }, dbFile);
    expect(p.id).toBeTruthy();
    expect(p.name).toBe("小明");
    expect(p.note).toBe("室友");

    const again = listPersons(dbFile);
    expect(again).toHaveLength(1);
    expect(again[0].name).toBe("小明");
  });

  it("姓名必填,空姓名抛错", () => {
    expect(() => createPerson({ name: "   " }, dbFile)).toThrow();
  });

  it("备注可选,默认空字符串", () => {
    const p = createPerson({ name: "小红" }, dbFile);
    expect(p.note).toBe("");
  });

  it("列表按创建时间排序", () => {
    createPerson({ name: "A" }, dbFile);
    createPerson({ name: "B" }, dbFile);
    const list = listPersons(dbFile);
    expect(list.map((p) => p.name)).toEqual(["A", "B"]);
  });
});
