"use client";

import { useEffect, useState } from "react";
import {
  monthlyDepreciation,
  depreciatedValue,
  monthsSince,
} from "@/lib/items";
import { formatDuration } from "@/lib/usage";

interface Item {
  id: string;
  name: string;
  category: "asset" | "consumable";
  purchasePrice: number;
  purchaseDate: string;
  lifespanMonths: number | null;
  stock: number | null;
  createdAt: string;
}

interface UsageRecord {
  id: string;
  itemId: string;
  startAt: string;
  endAt: string;
  note: string;
  createdAt: string;
}

function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function ItemManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"asset" | "consumable">("asset");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lifespan, setLifespan] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedUsageId, setExpandedUsageId] = useState<string | null>(null);
  const [usageByItem, setUsageByItem] = useState<Record<string, UsageRecord[]>>(
    {},
  );
  const [usageStart, setUsageStart] = useState("");
  const [usageEnd, setUsageEnd] = useState("");
  const [usageNote, setUsageNote] = useState("");

  async function load() {
    const res = await fetch("/api/items");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: Record<string, unknown> = {
      name,
      category,
      purchasePrice: Number(price),
      purchaseDate: date,
    };
    if (category === "asset") payload.lifespanMonths = Number(lifespan);
    else payload.stock = Number(stock);

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "创建失败");
      return;
    }
    setName("");
    setPrice("");
    setLifespan("");
    setStock("");
    await load();
  }

  async function handleDelete(item: Item) {
    setError("");
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "删除失败");
      return;
    }
    await load();
  }

  async function toggleUsage(item: Item) {
    if (expandedUsageId === item.id) {
      setExpandedUsageId(null);
      return;
    }
    setExpandedUsageId(item.id);
    if (!usageByItem[item.id]) {
      const res = await fetch(`/api/items/${item.id}/usage`);
      if (res.ok) {
        const list = (await res.json()) as UsageRecord[];
        setUsageByItem((prev) => ({ ...prev, [item.id]: list }));
      }
    }
  }

  async function handleAddUsage(item: Item) {
    setError("");
    const res = await fetch(`/api/items/${item.id}/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: usageStart,
        endAt: usageEnd,
        note: usageNote,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "添加失败");
      return;
    }
    setUsageStart("");
    setUsageEnd("");
    setUsageNote("");
    const list = await (await fetch(`/api/items/${item.id}/usage`)).json();
    setUsageByItem((prev) => ({ ...prev, [item.id]: list }));
  }

  return (
    <section>
      <h1>物品</h1>
      <form onSubmit={handleCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="物品名称"
          aria-label="物品名称"
        />
        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as "asset" | "consumable")
          }
          aria-label="类别"
        >
          <option value="asset">资产(摊销)</option>
          <option value="consumable">消耗品(库存)</option>
        </select>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="购买价格(日元)"
          aria-label="购买价格"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="购买日期"
        />
        {category === "asset" ? (
          <input
            type="number"
            min={1}
            value={lifespan}
            onChange={(e) => setLifespan(e.target.value)}
            placeholder="寿命月数"
            aria-label="寿命月数"
          />
        ) : (
          <input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="初始库存"
            aria-label="初始库存"
          />
        )}
        <button type="submit">添加物品</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              {it.name} — ¥{formatYen(it.purchasePrice)}
              {it.category === "asset" && it.lifespanMonths ? (
                <>
                  {" · "}
                  {`月摊销 ¥${formatYen(
                    monthlyDepreciation(it.purchasePrice, it.lifespanMonths),
                  )}`}
                  {" · "}
                  {`剩余 ¥${formatYen(
                    depreciatedValue(
                      it.purchasePrice,
                      it.lifespanMonths,
                      monthsSince(it.purchaseDate),
                    ),
                  )}`}
                </>
              ) : (
                <>{" · "}{`库存 ${it.stock}`}</>
              )}{" "}
              <button type="button" onClick={() => toggleUsage(it)}>
                {expandedUsageId === it.id ? "收起记录" : "使用记录"}
              </button>{" "}
              <button type="button" onClick={() => handleDelete(it)}>
                删除
              </button>
              {expandedUsageId === it.id && usageByItem[it.id] && (
                <div>
                  <ul>
                    {usageByItem[it.id].map((r) => (
                      <li key={r.id}>
                        {`${r.startAt.replace("T", " ")} → ${r.endAt.replace("T", " ")} · ${formatDuration(r.startAt, r.endAt)}`}
                        {r.note ? ` · ${r.note}` : ""}
                      </li>
                    ))}
                  </ul>
                  <input
                    type="datetime-local"
                    value={usageStart}
                    onChange={(e) => setUsageStart(e.target.value)}
                    aria-label="开始时间"
                  />
                  <input
                    type="datetime-local"
                    value={usageEnd}
                    onChange={(e) => setUsageEnd(e.target.value)}
                    aria-label="结束时间"
                  />
                  <input
                    value={usageNote}
                    onChange={(e) => setUsageNote(e.target.value)}
                    placeholder="备注(可选)"
                    aria-label="备注"
                  />
                  <button type="button" onClick={() => handleAddUsage(it)}>
                    添加记录
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
