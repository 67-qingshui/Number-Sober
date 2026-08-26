import { randomUUID } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";
import { balanceInner } from "./points-settle";

interface AdjustInput {
  date: string;
  description: string;
  amount: number; // 正=增加,负=扣减
}

function insertAdjust(
  db: import("better-sqlite3").Database,
  input: AdjustInput,
  currentAvailable: number,
): void {
  if (!Number.isInteger(input.amount) || input.amount === 0)
    throw new Error("调整金额必须是非零整数");
  if (!input.date) throw new Error("日期不能为空");

  if (input.amount < 0 && currentAvailable + input.amount < 0)
    throw new Error(`可用积分不足(当前 ${currentAvailable})`);

  const kind = input.amount > 0 ? "adjust" : "redeem";
  db.prepare(
    `INSERT INTO point_entries (id, entry_date, description, amount, available_at, kind, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    randomUUID(),
    input.date,
    input.description,
    input.amount,
    kind,
    new Date().toISOString(),
  );
}

/** 手动调整(正/负)。 */
export function adjustPoints(input: AdjustInput, dbPath?: string): void {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const bal = balanceInner(db);
    insertAdjust(db, input, bal.available);
  } finally {
    db.close();
  }
}

/** 转账:本账户转出(负记录),描述标注去向。 */
export function transferPoints(input: AdjustInput, dbPath?: string): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    throw new Error("转账金额必须是正整数");
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const bal = balanceInner(db);
    insertAdjust(
      db,
      {
        ...input,
        amount: -input.amount,
        description: `${input.description}(转出)`,
      },
      bal.available,
    );
  } finally {
    db.close();
  }
}
