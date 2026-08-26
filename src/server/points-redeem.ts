import { randomUUID } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";
import { getBalance, type Balance } from "./points-settle";

export interface RedeemInput {
  date: string;
  description: string;
  amount: number; // 正整数,表示抵扣的积分数量
}

/** 抵扣:从可用余额中扣除,写入负数 redeem 记录。 */
export function redeemPoints(input: RedeemInput, dbPath?: string): Balance {
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    throw new Error("抵扣金额必须是正整数");
  if (!input.date) throw new Error("日期不能为空");

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const bal = getBalance(dbPath);
    if (bal.available < input.amount)
      throw new Error(`可用积分不足(当前 ${bal.available})`);

    db.prepare(
      `INSERT INTO point_entries (id, entry_date, description, amount, available_at, kind, created_at)
       VALUES (?, ?, ?, ?, NULL, 'redeem', ?)`,
    ).run(
      randomUUID(),
      input.date,
      input.description,
      -input.amount,
      new Date().toISOString(),
    );
    return getBalance(dbPath);
  } finally {
    db.close();
  }
}
