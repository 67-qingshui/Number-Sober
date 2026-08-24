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
