/**
 * 摊销计算(直线摊销法)。
 * 金额单位为日元整数。
 */

/** 月摊销额 = 价格 ÷ 寿命月数,向上取整。 */
export function monthlyDepreciation(
  price: number,
  lifespanMonths: number,
): number {
  if (!Number.isInteger(lifespanMonths) || lifespanMonths <= 0)
    throw new Error("寿命月数必须为正整数");
  if (!Number.isInteger(price) || price < 0)
    throw new Error("价格必须是非负整数");
  return Math.ceil(price / lifespanMonths);
}

/**
 * 已过 elapsedMonths 个月后的剩余价值。
 * 钳制在 [0, 原价] 区间,摊销满后为 0。
 */
export function depreciatedValue(
  price: number,
  lifespanMonths: number,
  elapsedMonths: number,
): number {
  const monthly = monthlyDepreciation(price, lifespanMonths);
  const elapsed = Math.max(0, elapsedMonths);
  return Math.max(0, price - monthly * elapsed);
}

/** 已摊销金额 = 原价 − 剩余价值。 */
export function accumulatedDepreciation(
  price: number,
  lifespanMonths: number,
  elapsedMonths: number,
): number {
  return price - depreciatedValue(price, lifespanMonths, elapsedMonths);
}

/**
 * 计算购买日期距今的已过月数(自然月差,购买当月为 0)。
 */
export function monthsSince(purchaseDate: string, today: Date = new Date()): number {
  const buy = new Date(purchaseDate + "T00:00:00");
  if (Number.isNaN(buy.getTime())) throw new Error("购买日期无效");
  const diff =
    (today.getFullYear() - buy.getFullYear()) * 12 +
    (today.getMonth() - buy.getMonth());
  return Math.max(0, diff);
}
