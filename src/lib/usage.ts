/**
 * 使用时长计算。
 */

/** 计算使用时长并格式化为「X小时Y分」/「Y分」。 */
export function formatDuration(startAt: string, endAt: string): string {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(ms)) throw new Error("时间格式无效");
  if (ms < 0) throw new Error("结束时间不能早于开始时间");
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}小时${m}分` : `${m}分`;
}
