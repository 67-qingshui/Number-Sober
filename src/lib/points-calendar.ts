/**
 * 延迟到账日历数据构建(纯函数)。
 */

export interface CalendarEntryLike {
  amount: number;
  availableAt: string | null;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  total: number;
}

/** 将待入账条目按到期日(UTC 日期)分组求和,升序返回。 */
export function buildCalendar(
  entries: CalendarEntryLike[],
): CalendarDay[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.availableAt === null || e.amount <= 0) continue;
    const day = e.availableAt.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
