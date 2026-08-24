import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createItem } from "@/server/items";
import {
  changeStock,
  listStockChanges,
  getStock,
} from "@/server/stock";

describe("消耗品库存服务", () => {
  let dbFile: string;
  let itemId: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "st.db");
    itemId = createItem(
      { name: "墨盒", category: "consumable", purchasePrice: 3000, purchaseDate: "2026-08-01", stock: 5 },
      dbFile,
    ).id;
  });

  it("消耗扣减库存并记录变更", () => {
    changeStock({ itemId, delta: -2, note: "打印" }, dbFile);
    expect(getStock(itemId, dbFile)).toBe(3);
    const changes = listStockChanges(itemId, dbFile);
    expect(changes).toHaveLength(1);
    expect(changes[0].delta).toBe(-2);
  });

  it("补充增加库存", () => {
    changeStock({ itemId, delta: 5, note: "购入" }, dbFile);
    expect(getStock(itemId, dbFile)).toBe(10);
  });

  it("库存不足时消耗抛错且不产生变更", () => {
    expect(() =>
      changeStock({ itemId, delta: -10 }, dbFile),
    ).toThrow(/库存不足/);
    expect(getStock(itemId, dbFile)).toBe(5);
    expect(listStockChanges(itemId, dbFile)).toHaveLength(0);
  });

  it("零变更抛错", () => {
    expect(() => changeStock({ itemId, delta: 0 }, dbFile)).toThrow(/不能为 0/);
  });

  it("对非消耗品抛错", () => {
    const asset = createItem(
      { name: "打印机", category: "asset", purchasePrice: 120000, purchaseDate: "2026-01-15", lifespanMonths: 24 },
      dbFile,
    );
    expect(() => changeStock({ itemId: asset.id, delta: -1 }, dbFile)).toThrow(
      /消耗品/,
    );
  });

  it("物品不存在抛错", () => {
    expect(() => changeStock({ itemId: "no-such", delta: -1 }, dbFile)).toThrow(
      /物品/,
    );
  });
});
