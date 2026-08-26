import { openDb } from "./db";
import { runMigrations } from "./migrate";
import { listBills, computeSettlementSafe } from "./overview-helpers";
import { getBalance } from "./points-settle";

export interface Overview {
  personCount: number;
  openBills: number;
  receivableTotal: number;
  points: { available: number; pending: number };
  items: { count: number; assetValue: number };
}

export function getOverview(dbPath?: string): Overview {
  const db = openDb(dbPath);
  try {
    runMigrations(db);

    const personCount = (
      db.prepare("SELECT COUNT(*) AS t FROM persons").get() as { t: number }
    ).t;

    const openBillIds = (
      db
        .prepare("SELECT id, payer_id FROM aa_bills WHERE status = 'open'")
        .all() as { id: string; payer_id: string }[]
    );

    // 应收合计 = 各未结算账单垫付人应收之和
    let receivableTotal = 0;
    for (const row of openBillIds) {
      const s = computeSettlementSafe(db, row.id);
      if (s) receivableTotal += s.receivable;
    }

    const points = getBalance(dbPath);

    const itemCount = (
      db.prepare("SELECT COUNT(*) AS t FROM items").get() as { t: number }
    ).t;

    // 资产当前价值合计(直线摊销,按月)
    const itemRows = db
      .prepare(
        "SELECT purchase_price AS price, purchase_date AS date, lifespan_months AS lifespan FROM items WHERE category = 'asset' AND lifespan_months IS NOT NULL",
      )
      .all() as { price: number; date: string; lifespan: number }[];
    let assetValue = 0;
    const now = new Date();
    for (const r of itemRows) {
      const buy = new Date(r.date + "T00:00:00");
      const elapsed = Math.max(
        0,
        (now.getFullYear() - buy.getFullYear()) * 12 +
          (now.getMonth() - buy.getMonth()),
      );
      const monthly = Math.ceil(r.price / r.lifespan);
      assetValue += Math.max(0, r.price - monthly * Math.min(elapsed, r.lifespan));
    }

    return {
      personCount,
      openBills: openBillIds.length,
      receivableTotal,
      points,
      items: { count: itemCount, assetValue },
    };
  } finally {
    db.close();
  }
}
