"use client";

import { useEffect, useState } from "react";

export interface Person {
  id: string;
  name: string;
  note: string;
  createdAt: string;
}

export function PersonManager() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/persons");
    if (res.ok) setPersons(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/persons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "创建失败");
      return;
    }
    setName("");
    setNote("");
    await load();
  }

  return (
    <section>
      <h1>参与人</h1>
      <form onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入姓名…"
          aria-label="姓名"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注(可选)"
          aria-label="备注"
        />
        <button type="submit">新建</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {persons.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.note ? ` — ${p.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
