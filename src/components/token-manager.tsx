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

export function TokenManager() {
  const [entries, setEntries] = useState<TokenEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [inputTokens, setInputTokens] = useState("");
  const [cacheHitTokens, setCacheHitTokens] = useState("");
  const [outputTokens, setOutputTokens] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/token-entries");
    if (res.ok) setEntries(await res.json());
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
      {error && <p role="alert">{error}</p>}
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
