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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");

  async function load() {
    const res = await fetch("/api/persons");
    if (res.ok) setPersons(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
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

  function handleStartEdit(p: Person) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditNote(p.note);
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    setError("");
    const res = await fetch(`/api/persons/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, note: editNote }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "保存失败");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function handleDelete(p: Person) {
    setError("");
    const res = await fetch(`/api/persons/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "删除失败");
      return;
    }
    await load();
  }

  return (
    <section>
      <h1>参与人</h1>
      <form onSubmit={handleCreate}>
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
          {persons.map((p) =>
            editingId === p.id ? (
              <li key={p.id}>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  aria-label="编辑姓名"
                />
                <input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  aria-label="编辑备注"
                />
                <button type="button" onClick={handleSaveEdit}>
                  保存
                </button>
                <button type="button" onClick={handleCancelEdit}>
                  取消
                </button>
              </li>
            ) : (
              <li key={p.id}>
                {p.name}
                {p.note ? ` — ${p.note}` : ""}
                <button type="button" onClick={() => handleStartEdit(p)}>
                  编辑
                </button>
                <button type="button" onClick={() => handleDelete(p)}>
                  删除
                </button>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
