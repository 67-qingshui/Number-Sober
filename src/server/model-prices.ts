import { openDb } from "./db";
import { runMigrations } from "./migrate";

export interface ModelPriceRow {
  model: string;
  inputPrice: number;
  outputPrice: number;
  cacheHitPrice: number;
  createdAt: string;
}

export interface UpsertModelPriceInput {
  model: string;
  inputPrice: number;
  outputPrice: number;
  cacheHitPrice?: number;
}

function validate(input: UpsertModelPriceInput): void {
  if (!input.model.trim()) throw new Error("模型名不能为空");
  const prices = [
    input.inputPrice,
    input.outputPrice,
    input.cacheHitPrice ?? 0,
  ];
  if (prices.some((p) => p < 0 || !Number.isFinite(p)))
    throw new Error("单价不能为负数");
}

const SELECT =
  "SELECT model, input_price AS inputPrice, output_price AS outputPrice, cache_hit_price AS cacheHitPrice, created_at AS createdAt FROM model_prices";

export function upsertModelPrice(
  input: UpsertModelPriceInput,
  dbPath?: string,
): ModelPriceRow {
  validate(input);
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    const row: ModelPriceRow = {
      model: input.model.trim(),
      inputPrice: input.inputPrice,
      outputPrice: input.outputPrice,
      cacheHitPrice: input.cacheHitPrice ?? 0,
      createdAt: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO model_prices (model, input_price, output_price, cache_hit_price, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(model) DO UPDATE SET
         input_price = excluded.input_price,
         output_price = excluded.output_price,
         cache_hit_price = excluded.cache_hit_price,
         created_at = excluded.created_at`,
    ).run(
      row.model,
      row.inputPrice,
      row.outputPrice,
      row.cacheHitPrice,
      row.createdAt,
    );
    return row;
  } finally {
    db.close();
  }
}

export function listModelPrices(dbPath?: string): ModelPriceRow[] {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    return db.prepare(`${SELECT} ORDER BY model`).all() as ModelPriceRow[];
  } finally {
    db.close();
  }
}

export function deleteModelPrice(model: string, dbPath?: string): void {
  const db = openDb(dbPath);
  try {
    runMigrations(db);
    db.prepare("DELETE FROM model_prices WHERE model = ?").run(model);
  } finally {
    db.close();
  }
}
