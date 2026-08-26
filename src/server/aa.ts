import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { openDb } from "./db";
import { runMigrations } from "./migrate";
import {
  splitEqual,
  splitByRatio,
  validateAmountShares,
  computeSettlement,
  type SplitMode,
  type SettlementSummary,
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
  settledAt: string | null;
  total: number;
  items: BillItem[];
}

function personExists(db: Database.Database, id: string): boolean {
  return !!db.prepare("SELECT id FROM persons WHERE id = ?").get(id);
}

/** 计算条目参与人份额(按分摊模式),校验输入合法性。 */
function computeItemParticipants(
  db: Database.Database,
  item: BillItemInput,
): { personId: string; share: number }[] {
  const amount = item.amount;
  if (!Number.isInteger(amount) || amount <= 0)
    throw new Error("金额必须为正整数");

  const mode: SplitMode = item.splitMode ?? "equal";

  if (mode === "equal") {
    const participants = item.participants ?? [];
    if (participants.length === 0)
      throw new Error("条目至少需要一个参与人");
    for (const pid of participants) {
      if (!personExists(db, pid)) throw new Error("参与人不存在");
    }
    const shares = splitEqual(amount, participants.length);
    return participants.map((pid, i) => ({ personId: pid, share: shares[i] }));
  }

  const shares = item.shares ?? [];
  if (shares.length === 0) throw new Error("条目至少需要一个参与人份额");
  for (const s of shares) {
    if (!personExists(db, s.personId)) throw new Error("参与人不存在");
  }
  if (mode === "amount") {
    validateAmountShares(
      amount,
      shares.map((s) => s.share),
    );
    return shares.map((s) => ({ ...s }));
  }
  // ratio
  const allocated = splitByRatio(
    amount,
    shares.map((s) => s.share),
  );
  return shares.map((s, i) => ({ personId: s.personId, share: allocated[i] }));
}

/** 在事务内插入账单条目与参与人份额,返回完整条目对象。 */
function insertItems(
  db: Database.Database,
  billId: string,
  items: BillItemInput[],
): BillItem[] {
  return items.map((item, idx) => {
    const computed = computeItemParticipants(db, item);
    const itemId = randomUUID();
    const mode: SplitMode = item.splitMode ?? "equal";
    db.prepare(
      "INSERT INTO aa_bill_items (id, bill_id, description, amount, split_mode, position) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(itemId, billId, item.description.trim(), item.amount, mode, idx);

    for (const c of computed) {
      db.prepare(
        "INSERT INTO aa_bill_item_participants (item_id, person_id, share) VALUES (?, ?, ?)",
      ).run(itemId, c.personId, c.share);
    }
    return {
      id: itemId,
      billId,
      description: item.description.trim(),
      amount: item.amount,
      splitMode: mode,
      participants: computed,
    };
  });
}

function getBillInner(db: Database.Database, id: string): Bill {
  const row = db
    .prepare(
      "SELECT id, title, bill_date AS date, payer_id AS payerId, status, settled_at AS settledAt FROM aa_bills WHERE id = ?",
    )
    .get(id) as Pick<
    Bill,
    "id" | "title" | "date" | "payerId" | "status" | "settledAt"
  > | undefined;
  if (!row) throw new Error("账单不存在");

  const items = db
    .prepare(
      "SELECT id, bill_id AS billId, description, amount, split_mode AS splitMode FROM aa_bill_items WHERE bill_id = ? ORDER BY position",
    )
    .all(id) as (Omit<BillItem, "participants"> & {
    participants?: { personId: string; share: number }[];
  })[];

  const partsStmt = db.prepare(
    "SELECT person_id AS personId, share FROM aa_bill_item_participants WHERE item_id = ? ORDER BY rowid",
  );
  for (const item of items) {
    item.participants = partsStmt.all(item.id) as {
      personId: string;
      share: number;
    }[];
  }

  return {
    ...row,
    settledAt: row.settledAt ?? null,
    total: items.reduce((s, i) => s + i.amount, 0),
    items: items as BillItem[],
  };
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
    let items: BillItem[] = [];
    db.exec("BEGIN");
    try {
      db.prepare(
        "INSERT INTO aa_bills (id, title, bill_date, payer_id) VALUES (?, ?, ?, ?)",
      ).run(billId, title, input.date, input.payerId);
      items = insertItems(db, billId, input.items);
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
      settledAt: null,
      total: items.reduce((s, i) => s + i.amount, 0),
      items,
    };
  } finally {
    db.close();
  }
}

export function getBill(id: string, dbPath?: string): Bill {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return getBillInner(db, id);
  } finally {
    db.close();
  }
}

export function getSettlement(
  billId: string,
  dbPath?: string,
): SettlementSummary {
  return computeSettlement(getBill(billId, dbPath));
}

export function settleBill(id: string, dbPath?: string): Bill {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const bill = getBillInner(db, id);
    if (bill.status === "settled") throw new Error("账单已结算");
    db.prepare(
      "UPDATE aa_bills SET status = 'settled', settled_at = ? WHERE id = ?",
    ).run(new Date().toISOString(), id);
    return getBillInner(db, id);
  } finally {
    db.close();
  }
}

export function unsettleBill(id: string, dbPath?: string): Bill {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const bill = getBillInner(db, id);
    if (bill.status !== "settled") throw new Error("账单未结算");
    db.prepare(
      "UPDATE aa_bills SET status = 'open', settled_at = NULL WHERE id = ?",
    ).run(id);
    return getBillInner(db, id);
  } finally {
    db.close();
  }
}

export function updateBillItems(
  id: string,
  items: BillItemInput[],
  dbPath?: string,
): Bill {
  if (items.length === 0) throw new Error("至少需要一个条目");
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    if (!db.prepare("SELECT id FROM aa_bills WHERE id = ?").get(id))
      throw new Error("账单不存在");
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM aa_bill_items WHERE bill_id = ?").run(id);
      insertItems(db, id, items);
      db.exec("COMMIT");
      return getBillInner(db, id);
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
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
        "SELECT id, title, bill_date AS date, payer_id AS payerId, status, settled_at AS settledAt FROM aa_bills ORDER BY rowid DESC",
      )
      .all() as Pick<
      Bill,
      "id" | "title" | "date" | "payerId" | "status" | "settledAt"
    >[];

    const totalStmt = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS t FROM aa_bill_items WHERE bill_id = ?",
    );
    return rows.map((r) => ({
      ...r,
      settledAt: r.settledAt ?? null,
      total: (totalStmt.get(r.id) as { t: number }).t,
      items: [],
    }));
  } finally {
    db.close();
  }
}
