import type Database from "better-sqlite3";
import { openDb } from "./db";
import { runMigrations } from "./migrate";

/** 将 available_at <= now 的延迟积分置为立即可用(available_at = NULL)。返回结算积分总数。 */
export function settleDuePoints(now: Date, dbPath?: string): number {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const rows = db
      .prepare(
        "SELECT amount FROM point_entries WHERE available_at IS NOT NULL AND available_at <= ?",
      )
      .all(now.toISOString()) as { amount: number }[];
    if (rows.length === 0) return 0;
    const total = rows.reduce((s, r) => s + r.amount, 0);
    db.prepare(
      "UPDATE point_entries SET available_at = NULL WHERE available_at IS NOT NULL AND available_at <= ?",
    ).run(now.toISOString());
    return total;
  } finally {
    db.close();
  }
}

export interface Balance {
  available: number; // 已可用(含立即到账 + 已结算的延迟部分)
  pending: number; // 待入账
}

function balanceInner(db: Database.Database): Balance {
  const avail = db
    .prepare(
      // 已可用 = 所有 available_at 为空的条目之和(含抵扣的负数)
      "SELECT COALESCE(SUM(amount), 0) AS t FROM point_entries WHERE available_at IS NULL",
    )
    .get() as { t: number };
  const pending = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS t FROM point_entries WHERE amount > 0 AND available_at IS NOT NULL",
    )
    .get() as { t: number };
  return { available: Math.max(0, avail.t), pending: pending.t };
}

export function getBalance(dbPath?: string): Balance {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return balanceInner(db);
  } finally {
    db.close();
  }
}
