/**
 * 积分计算(纯函数)。积分为日元等价整数(1 积分 = 1 日元,可配置)。
 */

export interface PointsRule {
  ratePct: number; // 总返现比例 %
  immediatePct: number; // 其中立即到账的比例 %
  delayDays: number; // 延迟部分的天数
}

export interface EarnbackBreakdown {
  total: number;
  immediate: number;
  delayed: number;
}

function validateRule(rule: PointsRule): void {
  if (!Number.isFinite(rule.ratePct) || rule.ratePct < 0 || rule.ratePct > 100)
    throw new Error("返现比例必须在 0-100 之间");
  if (
    !Number.isFinite(rule.immediatePct) ||
    rule.immediatePct < 0 ||
    rule.immediatePct > 100
  )
    throw new Error("立即到账比例必须在 0-100 之间");
  if (!Number.isInteger(rule.delayDays) || rule.delayDays < 0)
    throw new Error("延迟天数必须是非负整数");
}

/** 消费金额 → 返现总额与立即/延迟拆分(均向下取整)。 */
export function calcEarnback(
  amount: number,
  rule: PointsRule,
): EarnbackBreakdown {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("金额无效");
  validateRule(rule);

  const total = Math.floor((amount * rule.ratePct) / 100);
  if (total === 0) return { total: 0, immediate: 0, delayed: 0 };

  let immediate: number;
  if (rule.delayDays === 0) {
    immediate = total;
  } else {
    immediate = Math.floor((total * rule.immediatePct) / 100);
  }
  return { total, immediate, delayed: total - immediate };
}

/** 延迟部分的到账时间(ISO 字符串)。 */
export function availableAtFor(delayedAt: Date, delayDays: number): string {
  const d = new Date(delayedAt);
  d.setDate(d.getDate() + delayDays);
  return d.toISOString();
}
