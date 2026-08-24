import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { openDb } from "./db";
import { runMigrations } from "./migrate";
import {
  splitEqual,
  splitByRatio,
  validateAmountShares,
  type SplitMode,
} from "@/lib/aa";

export interface BillItemShare {
  personId: string;
  share: number;
}

export interface BillItemInput {
  description: string;
  amount: number;
  participants?: string[]; // equal 模式使用
  splitMode?: SplitMode; // 默认 equal
  shares?: BillItemShare[]; // amount/ratio 模式使用
}

export interface CreateBillInput {
  title: string;
  date: string;
  payerId: string;
  items: BillItemInput[];
}

export interface BillItem {
  id: string;
  billId: string;
  description: string;
  amount: number;
  splitMode: SplitMode;
  participants: { personId: string; share: number }[];
}

export interface Bill {
  id: string;
  title: string;
  date: string;
  payerId: string;
  status: "open" | "settled";
  total: number;
  items: BillItem[];
}

function personExists(db: Database.Database, id: string): boolean {
  return !!db.prepare("SELECT id FROM persons WHERE id = ?").get(id);
}

export function createBill(input: CreateBillInput, dbPath?: string): Bill {
  const title = input.title.trim();
  if (!title) throw new Error("标题不能为空");
  if (input.items.length === 0) throw new Error("至少需要一个条目");

  const db = openDb(dbPath);
  try {
    runMigrations(db);
    if (!personExists(db, input.payerId)) throw new Error("垫付人不存在");

    const billId = randomUUID();
    const items: BillItem[] = [];
    db.exec("BEGIN");
    try {
      db.prepare(
        "INSERT INTO aa_bills (id, title, bill_date, payer_id) VALUES (?, ?, ?, ?)",
      ).run(billId, title, input.date, input.payerId);

      input.items.forEach((item, idx) => {
        const amount = item.amount;
        if (!Number.isInteger(amount) || amount <= 0)
          throw new Error("金额必须为正整数");

        const mode: SplitMode = item.splitMode ?? "equal";
        let computed: { personId: string; share: number }[];

        if (mode === "equal") {
          const participants = item.participants ?? [];
          if (participants.length === 0)
            throw new Error("条目至少需要一个参与人");
          for (const pid of participants) {
            if (!personExists(db, pid)) throw new Error("参与人不存在");
          }
          const shares = splitEqual(amount, participants.length);
          computed = participants.map((pid, i) => ({
            personId: pid,
            share: shares[i],
          }));
        } else {
          const shares = item.shares ?? [];
          if (shares.length === 0)
            throw new Error("条目至少需要一个参与人份额");
          for (const s of shares) {
            if (!personExists(db, s.personId))
              throw new Error("参与人不存在");
          }
          if (mode === "amount") {
            validateAmountShares(
              amount,
              shares.map((s) => s.share),
            );
            computed = shares.map((s) => ({ ...s }));
          } else {
            // ratio
            const allocated = splitByRatio(
              amount,
              shares.map((s) => s.share),
            );
            computed = shares.map((s, i) => ({
              personId: s.personId,
              share: allocated[i],
            }));
          }
        }

        const itemId = randomUUID();
        db.prepare(
          "INSERT INTO aa_bill_items (id, bill_id, description, amount, split_mode, position) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(itemId, billId, item.description.trim(), amount, mode, idx);

        for (const c of computed) {
          db.prepare(
            "INSERT INTO aa_bill_item_participants (item_id, person_id, share) VALUES (?, ?, ?)",
          ).run(itemId, c.personId, c.share);
        }
        items.push({
          id: itemId,
          billId,
          description: item.description.trim(),
          amount,
          splitMode: mode,
          participants: computed,
        });
      });

      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    return {
      id: billId,
      title,
      date: input.date,
      payerId: input.payerId,
      status: "open",
      total: input.items.reduce((s, i) => s + i.amount, 0),
      items,
    };
  } finally {
    db.close();
  }
}

export function listBills(dbPath?: string): Bill[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const rows = db
      .prepare(
        "SELECT id, title, bill_date AS date, payer_id AS payerId, status, created_at AS createdAt FROM aa_bills ORDER BY rowid DESC",
      )
      .all() as Pick<Bill, "id" | "title" | "date" | "payerId" | "status">[];

    const totalStmt = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS t FROM aa_bill_items WHERE bill_id = ?",
    );
    return rows.map((r) => ({
      ...r,
      total: (totalStmt.get(r.id) as { t: number }).t,
      items: [],
    }));
  } finally {
    db.close();
  }
}
