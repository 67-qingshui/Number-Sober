"use client";

import { useEffect, useState } from "react";
import {
  monthlyDepreciation,
  depreciatedValue,
  monthsSince,
} from "@/lib/items";

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
              <button type="button" onClick={() => handleDelete(it)}>
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
