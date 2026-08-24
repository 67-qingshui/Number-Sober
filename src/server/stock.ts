import { randomUUID } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

export interface StockChange {
  id: string;
  itemId: string;
  delta: number;
  note: string;
  createdAt: string;
}

export interface ChangeStockInput {
  itemId: string;
  delta: number;
  note?: string;
}

export function changeStock(
  input: ChangeStockInput,
  dbPath?: string,
): StockChange {
  if (!Number.isInteger(input.delta) || input.delta === 0)
    throw new Error("变更数量不能为 0");

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const item = db
      .prepare("SELECT id, category, stock FROM items WHERE id = ?")
      .get(input.itemId) as
      | { id: string; category: string; stock: number | null }
      | undefined;
    if (!item) throw new Error("物品不存在");
    if (item.category !== "consumable") throw new Error("只有消耗品有库存");

    const current = item.stock ?? 0;
    if (current + input.delta < 0) throw new Error("库存不足");

    const change: StockChange = {
      id: randomUUID(),
      itemId: input.itemId,
      delta: input.delta,
      note: (input.note ?? "").trim(),
      createdAt: new Date().toISOString(),
    };
    db.exec("BEGIN");
    try {
      db.prepare("UPDATE items SET stock = ? WHERE id = ?").run(
        current + input.delta,
        input.itemId,
      );
      db.prepare(
        "INSERT INTO stock_changes (id, item_id, delta, note, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(change.id, change.itemId, change.delta, change.note, change.createdAt);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return change;
  } finally {
    db.close();
  }
}

export function getStock(itemId: string, dbPath?: string): number {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const item = db
      .prepare("SELECT stock FROM items WHERE id = ?")
      .get(itemId) as { stock: number | null } | undefined;
    if (!item) throw new Error("物品不存在");
    return item.stock ?? 0;
  } finally {
    db.close();
  }
}

export function listStockChanges(
  itemId: string,
  dbPath?: string,
): StockChange[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return db
      .prepare(
        "SELECT id, item_id AS itemId, delta, note, created_at AS createdAt FROM stock_changes WHERE item_id = ? ORDER BY rowid DESC",
      )
      .all(itemId) as StockChange[];
  } finally {
    db.close();
  }
}
