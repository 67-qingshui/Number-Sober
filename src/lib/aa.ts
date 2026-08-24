export type SplitMode = "equal" | "amount" | "ratio";

/**
 * 均分:总额按人数平分,余数分配给前面的参与者。
 * 保证份额均为非负整数且总和恒等于金额。
 */
export function splitEqual(amount: number, count: number): number[] {
  if (!Number.isInteger(amount) || amount < 0)
    throw new Error("金额必须是非负整数");
  if (!Number.isInteger(count) || count <= 0)
    throw new Error("参与人数必须大于 0");
  const base = Math.floor(amount / count);
  const remainder = amount % count;
  return Array.from({ length: count }, (_, i) =>
    i < remainder ? base + 1 : base,
  );
}

/**
 * 自定义金额模式校验:份额必须覆盖全部金额(非负整数,合计等于条目金额)。
 */
export function validateAmountShares(amount: number, shares: number[]): void {
  if (shares.length === 0) throw new Error("至少需要一个份额");
  if (shares.some((s) => !Number.isInteger(s) || s < 0))
    throw new Error("份额必须是非负整数");
  const total = shares.reduce((a, b) => a + b, 0);
  if (total !== amount) throw new Error("份额合计不等于条目金额");
}

/**
 * 比例(权重)模式:最大余数法按权重分配,保证份额为非负整数且总和等于金额。
 * 权重为任意正数(如 1:2:3),内部按比例归一化。
 */
export function splitByRatio(amount: number, weights: number[]): number[] {
  if (!Number.isInteger(amount) || amount < 0)
    throw new Error("金额必须是非负整数");
  if (weights.length === 0) throw new Error("至少需要一个权重");
  if (weights.some((w) => !Number.isFinite(w) || w <= 0))
    throw new Error("权重必须为正数");
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const raw = weights.map((w) => (amount * w) / totalWeight);
  const floors = raw.map((v) => Math.floor(v));
  let remainder = amount - floors.reduce((a, b) => a + b, 0);
  if (remainder > 0) {
    const order = raw
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remainder; k++) {
      floors[order[k].i] += 1;
    }
  }
  return floors;
}

export interface Obligation {
  personId: string;
  owed: number; // 应付合计
  net: number; // 净额:正 = 应还(欠垫付人);负 = 应收(垫付人)
}

export interface SettlementSummary {
  payerId: string;
  total: number;
  obligations: Obligation[];
  receivable: number; // 垫付人应收合计(恒 ≥ 0)
}

/**
 * 结算:垫付人已支付整单总额,按每人应付份额计算应还/应收。
 * 非垫付人净额 = 应付(应还);垫付人净额 = 应付 − 总额(应收)。
 * 所有净额之和恒为 0。
 */
export function computeSettlement(bill: {
  payerId: string;
  items: { participants: { personId: string; share: number }[] }[];
}): SettlementSummary {
  const owed = new Map<string, number>();
  let total = 0;
  for (const item of bill.items) {
    for (const p of item.participants) {
      owed.set(p.personId, (owed.get(p.personId) ?? 0) + p.share);
      total += p.share;
    }
  }

  const obligations: Obligation[] = [...owed.entries()].map(
    ([personId, o]) => ({
      personId,
      owed: o,
      net: personId === bill.payerId ? o - total : o,
    }),
  );

  // 垫付人必须出现在结算清单中(即使未参与任何条目)
  if (!owed.has(bill.payerId)) {
    obligations.push({
      personId: bill.payerId,
      owed: 0,
      net: -total,
    });
  }

  const payer = obligations.find((o) => o.personId === bill.payerId);
  return {
    payerId: bill.payerId,
    total,
    obligations,
    receivable: payer ? Math.abs(payer.net) : 0,
  };
}
