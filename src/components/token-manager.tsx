"use client";

import { useEffect, useState } from "react";

interface TokenEntry {
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

interface TokenStats {
  totals: {
    inputTokens: number;
    cacheHitTokens: number;
    outputTokens: number;
    cost: number;
  };
  byDay: TokenAgg[];
  byModel: TokenAgg[];
}

interface TokenAgg {
  key: string;
  inputTokens: number;
  cacheHitTokens: number;
  outputTokens: number;
  cost: number;
}

export function TokenManager() {
  const [entries, setEntries] = useState<TokenEntry[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [inputTokens, setInputTokens] = useState("");
  const [cacheHitTokens, setCacheHitTokens] = useState("");
  const [outputTokens, setOutputTokens] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);

  async function load() {
    const [eRes, sRes] = await Promise.all([
      fetch("/api/token-entries"),
      fetch("/api/token-entries/stats"),
    ]);
    if (eRes.ok) setEntries(await eRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      date,
      provider,
      model,
      inputTokens: Number(inputTokens),
      cacheHitTokens: Number(cacheHitTokens || 0),
      outputTokens: Number(outputTokens),
      cost: Number(cost || 0),
    };
    const res = await fetch("/api/token-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "录入失败");
      return;
    }
    setProvider("");
    setModel("");
    setInputTokens("");
    setCacheHitTokens("");
    setOutputTokens("");
    setCost("");
    await load();
  }

  async function handleImport() {
    setError("");
    setImportResult(null);
    const res = await fetch("/api/token-entries/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "导入失败");
      return;
    }
    const r = (await res.json()) as {
      imported: number;
      failedRows: number;
      firstError: string | null;
    };
    setImportResult(
      `成功导入 ${r.imported} 条` +
        (r.failedRows > 0 ? `,失败 ${r.failedRows} 行:${r.firstError ?? ""}` : ""),
    );
    setCsvText("");
    await load();
  }

  return (
    <section>
      <h1>Token 利用</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="日期"
        />
        <input
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="提供商(如 deepseek)"
          aria-label="提供商"
        />
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="模型(如 deepseek-chat)"
          aria-label="模型"
        />
        <input
          type="number"
          min={0}
          value={inputTokens}
          onChange={(e) => setInputTokens(e.target.value)}
          placeholder="输入 Tokens"
          aria-label="输入 Tokens"
        />
        <input
          type="number"
          min={0}
          value={cacheHitTokens}
          onChange={(e) => setCacheHitTokens(e.target.value)}
          placeholder="缓存命中 Tokens"
          aria-label="缓存命中 Tokens"
        />
        <input
          type="number"
          min={0}
          value={outputTokens}
          onChange={(e) => setOutputTokens(e.target.value)}
          placeholder="输出 Tokens"
          aria-label="输出 Tokens"
        />
        <input
          type="number"
          min={0}
          step="0.0001"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="成本(USD)"
          aria-label="成本"
        />
        <button type="submit">录入</button>
      </form>
      <div>
        <h2>CSV 批量导入</h2>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={"date,provider,model,input_tokens,output_tokens\n2026-08-01,x,m,100,50"}
          aria-label="CSV 内容"
          rows={4}
        />
        <button type="button" onClick={handleImport}>
          导入 CSV
        </button>
        {importResult && <p>{importResult}</p>}
      </div>
      {error && <p role="alert">{error}</p>}
      {stats && (
        <div>
          <h2>总计</h2>
          <p>
            {`输入 ${stats.totals.inputTokens.toLocaleString()} · 缓存 ${stats.totals.cacheHitTokens.toLocaleString()} · 输出 ${stats.totals.outputTokens.toLocaleString()} · 成本 $${stats.totals.cost.toFixed(4)}`}
          </p>
          <h3>按天统计</h3>
          <ul>
            {stats.byDay.map((d) => (
              <li key={d.key}>
                {`${d.key} — 输入 ${d.inputTokens.toLocaleString()} · 缓存 ${d.cacheHitTokens.toLocaleString()} · 输出 ${d.outputTokens.toLocaleString()} · $${d.cost.toFixed(4)}`}
              </li>
            ))}
          </ul>
          <h3>按模型统计</h3>
          <ul>
            {stats.byModel.map((m) => (
              <li key={m.key}>
                {`${m.key} — 输入 ${m.inputTokens.toLocaleString()} · 缓存 ${m.cacheHitTokens.toLocaleString()} · 输出 ${m.outputTokens.toLocaleString()} · $${m.cost.toFixed(4)}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={e.id}>
              {e.date} {e.provider}/{e.model} — 输入 {e.inputTokens.toLocaleString()} · 缓存 {e.cacheHitTokens.toLocaleString()} · 输出 {e.outputTokens.toLocaleString()} · 成本 ${e.cost.toFixed(4)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
