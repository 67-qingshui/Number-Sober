import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

export type ItemCategory = "asset" | "consumable";

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  purchasePrice: number;
  purchaseDate: string;
  lifespanMonths: number | null;
  stock: number | null;
  createdAt: string;
}

export interface CreateItemInput {
  name: string;
  category: ItemCategory;
  purchasePrice: number;
  purchaseDate: string;
  lifespanMonths?: number;
  stock?: number;
}

export interface UpdateItemInput {
  name?: string;
  lifespanMonths?: number | null;
  stock?: number | null;
}

function validate(input: CreateItemInput): void {
  if (!input.name.trim()) throw new Error("名称不能为空");
  if (!Number.isInteger(input.purchasePrice) || input.purchasePrice < 0)
    throw new Error("价格必须是非负整数");
  if (!input.purchaseDate) throw new Error("购买日期不能为空");
  if (input.category === "asset") {
    if (!input.lifespanMonths || input.lifespanMonths <= 0)
      throw new Error("资产物品需要寿命月数(正整数)");
  } else if (input.stock === undefined || input.stock < 0) {
    throw new Error("消耗品库存必须是非负整数");
  }
}

function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as ItemCategory,
    purchasePrice: row.purchase_price as number,
    purchaseDate: row.purchase_date as string,
    lifespanMonths: (row.lifespan_months as number | null) ?? null,
    stock: (row.stock as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}

const SELECT = `SELECT id, name, category, purchase_price, purchase_date,
  lifespan_months, stock, created_at FROM items`;

function getItemInner(db: Database.Database, id: string): Item {
  const row = db.prepare(`${SELECT} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new Error("物品不存在");
  return rowToItem(row);
}

export function createItem(input: CreateItemInput, dbPath?: string): Item {
  validate(input);
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const item: Item = {
      id: randomUUID(),
      name: input.name.trim(),
      category: input.category,
      purchasePrice: input.purchasePrice,
      purchaseDate: input.purchaseDate,
      lifespanMonths: input.lifespanMonths ?? null,
      stock: input.category === "consumable" ? (input.stock ?? 0) : null,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO items (id, name, category, purchase_price, purchase_date, lifespan_months, stock, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      item.id,
      item.name,
      item.category,
      item.purchasePrice,
      item.purchaseDate,
      item.lifespanMonths,
      item.stock,
      item.createdAt,
    );
    return item;
  } finally {
    db.close();
  }
}

export function listItems(dbPath?: string): Item[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return (db.prepare(`${SELECT} ORDER BY rowid`).all() as Record<string, unknown>[]).map(rowToItem);
  } finally {
    db.close();
  }
}

export function getItem(id: string, dbPath?: string): Item {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return getItemInner(db, id);
  } finally {
    db.close();
  }
}

export function updateItem(
  id: string,
  input: UpdateItemInput,
  dbPath?: string,
): Item {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    getItemInner(db, id);
    if (input.name !== undefined) {
      if (!input.name.trim()) throw new Error("名称不能为空");
      db.prepare("UPDATE items SET name = ? WHERE id = ?").run(
        input.name.trim(),
        id,
      );
    }
    if (input.lifespanMonths !== undefined) {
      if (input.lifespanMonths !== null && input.lifespanMonths <= 0)
        throw new Error("寿命月数必须为正整数");
      db.prepare("UPDATE items SET lifespan_months = ? WHERE id = ?").run(
        input.lifespanMonths,
        id,
      );
    }
    if (input.stock !== undefined) {
      if (input.stock !== null && input.stock < 0)
        throw new Error("库存不能为负");
      db.prepare("UPDATE items SET stock = ? WHERE id = ?").run(
        input.stock,
        id,
      );
    }
    return getItemInner(db, id);
  } finally {
    db.close();
  }
}

export function deleteItem(id: string, dbPath?: string): void {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    getItemInner(db, id);
    db.prepare("DELETE FROM items WHERE id = ?").run(id);
  } finally {
    db.close();
  }
}
