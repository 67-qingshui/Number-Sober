"use client";

import { useEffect, useState } from "react";

interface Person {
  id: string;
  name: string;
  note: string;
  createdAt: string;
}

interface Bill {
  id: string;
  title: string;
  date: string;
  payerId: string;
  status: string;
  total: number;
}

interface BillItemInput {
  description: string;
  amount: string;
  participants: string[];
}

function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function BillManager() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerId, setPayerId] = useState("");
  const [items, setItems] = useState<BillItemInput[]>([
    { description: "", amount: "", participants: [] },
  ]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [pRes, bRes] = await Promise.all([
      fetch("/api/persons"),
      fetch("/api/aa/bills"),
    ]);
    if (pRes.ok) {
      const ps = (await pRes.json()) as Person[];
      setPersons(ps);
      setPayerId((prev) => prev || (ps.length ? ps[0].id : ""));
    }
    if (bRes.ok) setBills(await bRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateItem(idx: number, patch: Partial<BillItemInput>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function toggleParticipant(idx: number, pid: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const has = it.participants.includes(pid);
        return {
          ...it,
          participants: has
            ? it.participants.filter((p) => p !== pid)
            : [...it.participants, pid],
        };
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      title,
      date,
      payerId,
      items: items.map((it) => ({
        description: it.description,
        amount: Number(it.amount),
        participants: it.participants,
      })),
    };
    const res = await fetch("/api/aa/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "创建失败");
      return;
    }
    setTitle("");
    setItems([{ description: "", amount: "", participants: [] }]);
    const bRes = await fetch("/api/aa/bills");
    if (bRes.ok) setBills(await bRes.json());
  }

  const personName = (id: string) =>
    persons.find((p) => p.id === id)?.name ?? id;

  return (
    <section>
      <h1>AA 账单</h1>
      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="账单标题,如:聚餐"
          aria-label="标题"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="日期"
        />
        <select
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          aria-label="垫付人"
        >
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {items.map((it, idx) => (
          <fieldset key={idx}>
            <legend>条目 {idx + 1}</legend>
            <input
              value={it.description}
              onChange={(e) => updateItem(idx, { description: e.target.value })}
              placeholder="描述"
              aria-label={`条目 ${idx + 1} 描述`}
            />
            <input
              type="number"
              min={1}
              value={it.amount}
              onChange={(e) => updateItem(idx, { amount: e.target.value })}
              placeholder="金额(日元)"
              aria-label={`条目 ${idx + 1} 金额`}
            />
            <div>
              {persons.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={it.participants.includes(p.id)}
                    onChange={() => toggleParticipant(idx, p.id)}
                    aria-label={`参与人 ${p.name}(条目 ${idx + 1})`}
                  />
                  {p.name}
                </label>
              ))}
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                移除条目
              </button>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() =>
            setItems((prev) => [
              ...prev,
              { description: "", amount: "", participants: [] },
            ])
          }
        >
          添加条目
        </button>
        <button type="submit">创建账单</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {bills.map((b) => (
            <li key={b.id}>
              {b.title} — ¥{formatYen(b.total)}(垫付:{personName(b.payerId)})
              {b.status === "settled" ? " · 已结算" : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
