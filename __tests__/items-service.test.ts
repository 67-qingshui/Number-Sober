import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
} from "@/server/items";

describe("物品服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "i.db");
  });

  it("创建资产物品并持久化", () => {
    const item = createItem(
      {
        name: "打印机",
        category: "asset",
        purchasePrice: 120000,
        purchaseDate: "2026-01-15",
        lifespanMonths: 24,
      },
      dbFile,
    );
    expect(item.id).toBeTruthy();
    expect(item.name).toBe("打印机");
    expect(item.lifespanMonths).toBe(24);
    expect(listItems(dbFile)).toHaveLength(1);
  });

  it("创建消耗品(含库存)", () => {
    const item = createItem(
      {
        name: "墨盒",
        category: "consumable",
        purchasePrice: 3000,
        purchaseDate: "2026-08-01",
        stock: 5,
      },
      dbFile,
    );
    expect(item.category).toBe("consumable");
    expect(item.stock).toBe(5);
  });

  it("空名称抛错", () => {
    expect(() =>
      createItem(
        { name: "  ", category: "asset", purchasePrice: 100, purchaseDate: "2026-01-01", lifespanMonths: 12 },
        dbFile,
      ),
    ).toThrow(/名称/);
  });

  it("资产物品缺少寿命月数抛错", () => {
    expect(() =>
      createItem(
        { name: "x", category: "asset", purchasePrice: 100, purchaseDate: "2026-01-01" },
        dbFile,
      ),
    ).toThrow(/寿命/);
  });

  it("消耗品库存为负抛错", () => {
    expect(() =>
      createItem(
        { name: "x", category: "consumable", purchasePrice: 100, purchaseDate: "2026-01-01", stock: -1 },
        dbFile,
      ),
    ).toThrow(/库存/);
  });

  it("更新物品名称与寿命", () => {
    const item = createItem(
      { name: "打印机", category: "asset", purchasePrice: 120000, purchaseDate: "2026-01-15", lifespanMonths: 24 },
      dbFile,
    );
    const updated = updateItem(
      item.id,
      { name: "激光打印机", lifespanMonths: 36 },
      dbFile,
    );
    expect(updated.name).toBe("激光打印机");
    expect(updated.lifespanMonths).toBe(36);
  });

  it("删除物品后列表为空", () => {
    const item = createItem(
      { name: "x", category: "asset", purchasePrice: 100, purchaseDate: "2026-01-01", lifespanMonths: 12 },
      dbFile,
    );
    deleteItem(item.id, dbFile);
    expect(listItems(dbFile)).toHaveLength(0);
  });

  it("getItem 不存在的物品抛错", () => {
    expect(() => getItem("no-such", dbFile)).toThrow(/不存在/);
  });
});
