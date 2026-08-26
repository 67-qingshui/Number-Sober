/**
 * Token 用量 CSV 导入解析(纯函数)。
 * 表头:date,provider,model,input_tokens[,cache_hit_tokens][,output_tokens][,cost]
 */

export interface ParsedTokenRow {
  date: string;
  provider: string;
  model: string;
  inputTokens: number;
  cacheHitTokens: number;
  outputTokens: number;
  cost: number;
}

function num(value: string | undefined, lineNo: number): number {
  const raw = (value ?? "").trim();
  if (!raw) throw new Error(`第 ${lineNo} 行数字无效`);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`第 ${lineNo} 行数字无效`);
  return n;
}

/** 可选数值列:空值视为 0,非法值抛错。 */
function numOr0(value: string | undefined, lineNo: number): number {
  const raw = (value ?? "").trim();
  if (!raw) return 0;
  return num(raw, lineNo);
}

export function parseTokenCsv(csv: string): ParsedTokenRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  return lines.slice(1).map((line, i) => {
    const lineNo = i + 2; // 含表头,从第 2 行起是数据
    const cols = line.split(",").map((c) => c.trim());

    const dateIdx = idx("date");
    if (dateIdx < 0 || !cols[dateIdx]) throw new Error(`第 ${lineNo} 行缺少日期`);

    return {
      date: cols[dateIdx],
      provider: cols[idx("provider")] ?? "",
      model: cols[idx("model")] ?? "",
      inputTokens: num(cols[idx("input_tokens")], lineNo),
      cacheHitTokens:
        idx("cache_hit_tokens") >= 0
          ? numOr0(cols[idx("cache_hit_tokens")], lineNo)
          : 0,
      outputTokens: num(cols[idx("output_tokens")], lineNo),
      cost: idx("cost") >= 0 ? numOr0(cols[idx("cost")], lineNo) : 0,
    };
  });
}
