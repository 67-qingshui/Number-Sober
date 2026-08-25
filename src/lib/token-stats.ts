/**
 * Token 用量统计聚合(纯函数)。
 */

export interface TokenEntryLike {
  date: string;
  model: string;
  inputTokens: number;
  cacheHitTokens: number;
  outputTokens: number;
  cost: number;
}

export interface TokenAggregate {
  key: string;
  inputTokens: number;
  cacheHitTokens: number;
  outputTokens: number;
  cost: number;
}

export interface TokenTotals {
  inputTokens: number;
  cacheHitTokens: number;
  outputTokens: number;
  cost: number;
}

function aggregate(entries: TokenEntryLike[], keyFn: (e: TokenEntryLike) => string): TokenAggregate[] {
  const map = new Map<string, TokenAggregate>();
  for (const e of entries) {
    const key = keyFn(e);
    const cur = map.get(key) ?? {
      key,
      inputTokens: 0,
      cacheHitTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    cur.inputTokens += e.inputTokens;
    cur.cacheHitTokens += e.cacheHitTokens;
    cur.outputTokens += e.outputTokens;
    cur.cost += e.cost;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

export function aggregateByDay(entries: TokenEntryLike[]): TokenAggregate[] {
  return aggregate(entries, (e) => e.date);
}

export function aggregateByModel(entries: TokenEntryLike[]): TokenAggregate[] {
  return aggregate(entries, (e) => e.model);
}

export function totalStats(entries: TokenEntryLike[]): TokenTotals {
  return {
    inputTokens: entries.reduce((s, e) => s + e.inputTokens, 0),
    cacheHitTokens: entries.reduce((s, e) => s + e.cacheHitTokens, 0),
    outputTokens: entries.reduce((s, e) => s + e.outputTokens, 0),
    cost: entries.reduce((s, e) => s + e.cost, 0),
  };
}
