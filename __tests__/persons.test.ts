import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import {
  createPerson,
  listPersons,
  updatePerson,
  deletePerson,
} from "@/server/persons";

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

  it("更新参与人姓名与备注并持久化", () => {
    const p = createPerson({ name: "小明", note: "旧备注" }, dbFile);
    const updated = updatePerson(p.id, { name: "大明", note: "新备注" }, dbFile);
    expect(updated.name).toBe("大明");
    expect(updated.note).toBe("新备注");
    expect(listPersons(dbFile)[0].name).toBe("大明");
  });

  it("更新时姓名必填,空姓名抛错", () => {
    const p = createPerson({ name: "小明" }, dbFile);
    expect(() => updatePerson(p.id, { name: "  " }, dbFile)).toThrow();
  });

  it("更新不存在的参与人抛错", () => {
    expect(() =>
      updatePerson("no-such-id", { name: "X" }, dbFile),
    ).toThrow(/不存在/);
  });

  it("删除参与人后列表为空", () => {
    const p = createPerson({ name: "小明" }, dbFile);
    deletePerson(p.id, dbFile);
    expect(listPersons(dbFile)).toHaveLength(0);
  });

  it("删除不存在的参与人抛错", () => {
    expect(() => deletePerson("no-such-id", dbFile)).toThrow(/不存在/);
  });

  it("被引用时禁止删除", () => {
    const p = createPerson({ name: "小明" }, dbFile);
    // 模拟未来 AA 账单表引用该参与人
    const db = new Database(dbFile);
    db.exec("CREATE TABLE aa_bills (id TEXT PRIMARY KEY, payer_id TEXT)");
    db.prepare("INSERT INTO aa_bills VALUES (?, ?)").run("b1", p.id);
    db.close();

    expect(() => deletePerson(p.id, dbFile)).toThrow(/引用/);
    expect(listPersons(dbFile)).toHaveLength(1);
  });
});
