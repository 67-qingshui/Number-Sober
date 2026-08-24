import { randomUUID } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

export interface UsageRecord {
  id: string;
  itemId: string;
  startAt: string;
  endAt: string;
  note: string;
  createdAt: string;
}

export interface AddUsageInput {
  itemId: string;
  startAt: string;
  endAt: string;
  note?: string;
}

function validateTime(startAt: string, endAt: string): void {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(ms)) throw new Error("时间格式无效");
  if (ms < 0) throw new Error("结束时间不能早于开始时间");
}

export function addUsageRecord(
  input: AddUsageInput,
  dbPath?: string,
): UsageRecord {
  validateTime(input.startAt, input.endAt);
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const item = db.prepare("SELECT id FROM items WHERE id = ?").get(input.itemId);
    if (!item) throw new Error("物品不存在");

    const rec: UsageRecord = {
      id: randomUUID(),
      itemId: input.itemId,
      startAt: input.startAt,
      endAt: input.endAt,
      note: (input.note ?? "").trim(),
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      "INSERT INTO usage_records (id, item_id, start_at, end_at, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(rec.id, rec.itemId, rec.startAt, rec.endAt, rec.note, rec.createdAt);
    return rec;
  } finally {
    db.close();
  }
}

export function listUsageRecords(
  itemId: string,
  dbPath?: string,
): UsageRecord[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return db
      .prepare(
        "SELECT id, item_id AS itemId, start_at AS startAt, end_at AS endAt, note, created_at AS createdAt FROM usage_records WHERE item_id = ? ORDER BY start_at DESC",
      )
      .all(itemId) as UsageRecord[];
  } finally {
    db.close();
  }
}
