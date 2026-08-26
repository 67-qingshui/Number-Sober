import type Database from "better-sqlite3";
import { computeSettlement, type SettlementSummary } from "@/lib/aa";

/** 在已打开连接上计算某账单结算摘要;账单不存在返回 null。 */
export function computeSettlementSafe(
  db: Database.Database,
  billId: string,
): SettlementSummary | null {
  const bill = db
    .prepare("SELECT payer_id FROM aa_bills WHERE id = ?")
    .get(billId) as { payer_id: string } | undefined;
  if (!bill) return null;

  const items = db
    .prepare(
      `SELECT i.id FROM aa_bill_items i WHERE i.bill_id = ? ORDER BY i.position`,
    )
    .all(billId) as { id: string }[];

  const shaped = items.map((it) => ({
    participants: db
      .prepare(
        "SELECT person_id AS personId, share FROM aa_bill_item_participants WHERE item_id = ? ORDER BY rowid",
      )
      .all(it.id) as { personId: string; share: number }[],
  }));

  return computeSettlement({ payerId: bill.payer_id, items: shaped });
}

export { listBills } from "./aa";
