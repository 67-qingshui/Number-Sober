"use client";

import { useEffect, useState } from "react";

interface ModelPriceRow {
  model: string;
  inputPrice: number;
  outputPrice: number;
  cacheHitPrice: number;
  createdAt: string;
}

export function ModelPriceManager() {
  const [prices, setPrices] = useState<ModelPriceRow[]>([]);
  const [model, setModel] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [cacheHitPrice, setCacheHitPrice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/model-prices");
    if (res.ok) setPrices(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/model-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        inputPrice: Number(inputPrice),
        outputPrice: Number(outputPrice),
        cacheHitPrice: Number(cacheHitPrice || 0),
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "保存失败");
      return;
    }
    setModel("");
    setInputPrice("");
    setOutputPrice("");
    setCacheHitPrice("");
    await load();
  }

  async function handleDelete(row: ModelPriceRow) {
    setError("");
    const res = await fetch(
      `/api/model-prices/${encodeURIComponent(row.model)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "删除失败");
      return;
    }
    await load();
  }

  return (
    <section>
      <h1>模型单价</h1>
      <p>单价单位:美元 / 百万 token。同模型重复保存将覆盖旧值。</p>
      <form onSubmit={handleSave}>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="模型名(如 deepseek-chat)"
          aria-label="模型名"
        />
        <input
          type="number"
          min={0}
          step="0.0001"
          value={inputPrice}
          onChange={(e) => setInputPrice(e.target.value)}
          placeholder="输入单价($/M)"
          aria-label="输入单价"
        />
        <input
          type="number"
          min={0}
          step="0.0001"
          value={outputPrice}
          onChange={(e) => setOutputPrice(e.target.value)}
          placeholder="输出单价($/M)"
          aria-label="输出单价"
        />
        <input
          type="number"
          min={0}
          step="0.0001"
          value={cacheHitPrice}
          onChange={(e) => setCacheHitPrice(e.target.value)}
          placeholder="缓存命中单价($/M,可省略)"
          aria-label="缓存命中单价"
        />
        <button type="submit">保存单价</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {prices.map((p) => (
            <li key={p.model}>
              {`${p.model} — 输入 $${p.inputPrice} · 输出 $${p.outputPrice} · 缓存 $${p.cacheHitPrice}`}{" "}
              <button type="button" onClick={() => handleDelete(p)}>
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
