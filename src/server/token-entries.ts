import { randomUUID } from "node:crypto";
import { openDb } from "./db";
import { runMigrations } from "./migrate";
import { parseTokenCsv, type ParsedTokenRow } from "@/lib/token-csv";
import {
  aggregateByDay,
  aggregateByModel,
  totalStats,
} from "@/lib/token-stats";

export interface TokenEntry {
  id: string;
  date: string;
  provider: string;
  model: string;
  inputTokens: number;
  cacheHitTokens: number;
  outputTokens: number;
  cost: number;
  createdAt: string;
}

export interface CreateTokenEntryInput {
  date: string;
  provider: string;
  model: string;
  inputTokens: number;
  cacheHitTokens?: number;
  outputTokens: number;
  cost?: number;
}

function validate(input: CreateTokenEntryInput): void {
  if (!input.model.trim()) throw new Error("模型名不能为空");
  if (!input.provider.trim()) throw new Error("提供商不能为空");
  const nums = [
    input.inputTokens,
    input.cacheHitTokens ?? 0,
    input.outputTokens,
  ];
  if (nums.some((n) => !Number.isInteger(n) || n < 0))
    throw new Error("Token 数量必须是非负整数");
  if (input.cost !== undefined && (input.cost < 0 || !Number.isFinite(input.cost)))
    throw new Error("成本不能为负数");
}

export function createTokenEntry(
  input: CreateTokenEntryInput,
  dbPath?: string,
): TokenEntry {
  validate(input);
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const entry: TokenEntry = {
      id: randomUUID(),
      date: input.date,
      provider: input.provider.trim(),
      model: input.model.trim(),
      inputTokens: input.inputTokens,
      cacheHitTokens: input.cacheHitTokens ?? 0,
      outputTokens: input.outputTokens,
      cost: input.cost ?? 0,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO token_entries (id, entry_date, provider, model, input_tokens, cache_hit_tokens, output_tokens, cost, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      entry.id,
      entry.date,
      entry.provider,
      entry.model,
      entry.inputTokens,
      entry.cacheHitTokens,
      entry.outputTokens,
      entry.cost,
      entry.createdAt,
    );
    return entry;
  } finally {
    db.close();
  }
}

export function listTokenEntries(dbPath?: string): TokenEntry[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return db
      .prepare(
        `SELECT id, entry_date AS date, provider, model, input_tokens AS inputTokens,
                cache_hit_tokens AS cacheHitTokens, output_tokens AS outputTokens,
                cost, created_at AS createdAt
         FROM token_entries ORDER BY entry_date DESC, rowid DESC`,
      )
      .all() as TokenEntry[];
  } finally {
    db.close();
  }
}

export interface TokenStats {
  totals: {
    inputTokens: number;
    cacheHitTokens: number;
    outputTokens: number;
    cost: number;
  };
  byDay: {
    key: string;
    inputTokens: number;
    cacheHitTokens: number;
    outputTokens: number;
    cost: number;
  }[];
  byModel: {
    key: string;
    inputTokens: number;
    cacheHitTokens: number;
    outputTokens: number;
    cost: number;
  }[];
}

export function getTokenStats(dbPath?: string): TokenStats {
  const entries = listTokenEntries(dbPath);
  return {
    totals: totalStats(entries),
    byDay: aggregateByDay(entries),
    byModel: aggregateByModel(entries),
  };
}

export interface ImportResult {
  imported: number;
  failedRows: number;
  firstError: string | null;
}

/** 批量导入 CSV。逐行独立校验,失败行跳过并计数(事务保证部分成功)。 */
export function importTokenCsv(csv: string, dbPath?: string): ImportResult {
  const rows = parseTokenCsv(csv);
  if (rows.length === 0) return { imported: 0, failedRows: 0, firstError: null };

  let imported = 0;
  let failedRows = 0;
  let firstError: string | null = null;

  for (const row of rows) {
    try {
      createTokenEntry(
        {
          date: row.date,
          provider: row.provider,
          model: row.model,
          inputTokens: row.inputTokens,
          cacheHitTokens: row.cacheHitTokens,
          outputTokens: row.outputTokens,
          cost: row.cost,
        },
        dbPath,
      );
      imported++;
    } catch (err) {
      failedRows++;
      if (!firstError)
        firstError = err instanceof Error ? err.message : "未知错误";
    }
  }
  return { imported, failedRows, firstError };
}
