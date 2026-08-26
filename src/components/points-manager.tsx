"use client";

import { useEffect, useState } from "react";

interface PointEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  availableAt: string | null;
  kind: string;
  createdAt: string;
}

interface Balance {
  available: number;
  pending: number;
}

export function PointsManager() {
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [ratePct, setRatePct] = useState("5");
  const [immediatePct, setImmediatePct] = useState("20");
  const [delayDays, setDelayDays] = useState("30");
  const [error, setError] = useState("");
  const [lastEarnback, setLastEarnback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [eRes, bRes] = await Promise.all([
      fetch("/api/points"),
      fetch("/api/points/balance"),
    ]);
    if (eRes.ok) setEntries(await eRes.json());
    if (bRes.ok) setBalance(await bRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLastEarnback(null);
    const res = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        description,
        amount: Number(amount),
        rule: {
          ratePct: Number(ratePct),
          immediatePct: Number(immediatePct),
          delayDays: Number(delayDays),
        },
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "记录失败");
      return;
    }
    const d = await res.json();
    setLastEarnback(
      `返 ${d.earnback.total} 积分(立即 ${d.earnback.immediate},延迟 ${d.earnback.delayed})`,
    );
    setDescription("");
    setAmount("");
    await load();
  }

  async function handleSettle() {
    setError("");
    const res = await fetch("/api/points/balance", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "结算失败");
      return;
    }
    const d = await res.json();
    if (d.settled > 0) setLastEarnback(`已到账 ${d.settled} 积分`);
    await load();
  }

  return (
    <section>
      <h1>积分</h1>
      <form onSubmit={handleRecord}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="消费日期"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="消费描述"
          aria-label="消费描述"
        />
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="消费金额(日元)"
          aria-label="消费金额"
        />
        <input
          type="number"
          min={0}
          value={ratePct}
          onChange={(e) => setRatePct(e.target.value)}
          placeholder="返现比例%"
          aria-label="返现比例%"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={immediatePct}
          onChange={(e) => setImmediatePct(e.target.value)}
          placeholder="立即到账比例%"
          aria-label="立即到账比例%"
        />
        <input
          type="number"
          min={0}
          value={delayDays}
          onChange={(e) => setDelayDays(e.target.value)}
          placeholder="延迟天数"
          aria-label="延迟天数"
        />
        <button type="submit">记录消费</button>
      </form>
      {lastEarnback && <p>{lastEarnback}</p>}
      {error && <p role="alert">{error}</p>}
      {balance && (
        <div>
          <p>
            {`可用 ${balance.available.toLocaleString()} · 待入账 ${balance.pending.toLocaleString()}`}{" "}
            <button type="button" onClick={handleSettle}>
              结算到期积分
            </button>
          </p>
        </div>
      )}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li key={e.id}>
              {`${e.date} ${e.description} +${e.amount}`}
              {e.availableAt
                ? ` · ${e.availableAt.slice(0, 10)} 到账`
                : " · 可用"}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
