import { randomUUID } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";
import {
  calcEarnback,
  availableAtFor,
  type PointsRule,
} from "@/lib/points";

export interface PointEntry {
  id: string;
  date: string;
  description: string;
  amount: number; // 正=获得,负=消耗
  availableAt: string | null; // null = 已可用
  kind: "earn" | "redeem" | "adjust" | "transfer";
  createdAt: string;
}

export interface AddConsumptionInput {
  date: string;
  description: string;
  amount: number;
  rule: PointsRule;
}

const SELECT = `SELECT id, entry_date AS date, description, amount, available_at AS availableAt, kind, created_at AS createdAt FROM point_entries`;

function rowToEntry(row: Record<string, unknown>): PointEntry {
  return {
    ...(row as unknown as PointEntry),
    availableAt: (row.availableAt as string | null) ?? null,
  };
}

function listEntriesInner(
  db: import("better-sqlite3").Database,
): PointEntry[] {
  return (
    db.prepare(`${SELECT} ORDER BY entry_date DESC, rowid DESC`).all() as Record<
      string,
      unknown
    >[]
  ).map(rowToEntry);
}

/** 记录一笔消费并按规则返积分(立即部分 + 延迟部分)。 */
export function addConsumption(
  input: AddConsumptionInput,
  dbPath?: string,
): { earnback: ReturnType<typeof calcEarnback> } {
  if (!input.date) throw new Error("日期不能为空");
  const earnback = calcEarnback(input.amount, input.rule);

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    db.exec("BEGIN");
    try {
      const now = new Date().toISOString();
      // 消费记录(amount 为负的支出记录,kind='spend' 不存在——消费本身不存积分表)
      if (earnback.immediate > 0) {
        db.prepare(
          `INSERT INTO point_entries (id, entry_date, description, amount, available_at, kind, created_at)
           VALUES (?, ?, ?, ?, NULL, 'earn', ?)`,
        ).run(
          randomUUID(),
          input.date,
          `${input.description}(立即)`,
          earnback.immediate,
          now,
        );
      }
      if (earnback.delayed > 0) {
        const availableAt = availableAtFor(new Date(input.date), input.rule.delayDays);
        db.prepare(
          `INSERT INTO point_entries (id, entry_date, description, amount, available_at, kind, created_at)
           VALUES (?, ?, ?, ?, ?, 'earn', ?)`,
        ).run(
          randomUUID(),
          input.date,
          `${input.description}(延迟)`,
          earnback.delayed,
          availableAt,
          now,
        );
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    return { earnback };
  } finally {
    db.close();
  }
}

export function listPointEntries(dbPath?: string): PointEntry[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return listEntriesInner(db);
  } finally {
    db.close();
  }
}
