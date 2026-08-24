"use client";

import { useEffect, useState } from "react";

type SplitMode = "equal" | "amount" | "ratio";

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

interface BillItem {
  id: string;
  billId: string;
  description: string;
  amount: number;
  splitMode: SplitMode;
  participants: { personId: string; share: number }[];
}

interface BillDetail extends Bill {
  items: BillItem[];
}

interface SettlementSummary {
  payerId: string;
  total: number;
  receivable: number;
  obligations: { personId: string; owed: number; net: number }[];
}

interface BillItemInput {
  description: string;
  amount: string;
  splitMode: SplitMode;
  participants: string[];
  shareValues: Record<string, string>;
}

const EMPTY_ITEM = (): BillItemInput => ({
  description: "",
  amount: "",
  splitMode: "equal",
  participants: [],
  shareValues: {},
});

function formatYen(n: number): string {
  return n.toLocaleString("ja-JP");
}

function billToForm(bill: BillDetail): BillItemInput[] {
  return bill.items.map((it) => ({
    description: it.description,
    amount: String(it.amount),
    splitMode: it.splitMode,
    participants: it.participants.map((p) => p.personId),
    shareValues: Object.fromEntries(
      it.participants.map((p) => [p.personId, String(p.share)]),
    ),
  }));
}

const MODE_LABEL: Record<SplitMode, string> = {
  equal: "均分",
  amount: "自定义金额",
  ratio: "比例权重",
};

export function BillManager() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [details, setDetails] = useState<Record<string, BillDetail>>({});
  const [settlements, setSettlements] = useState<
    Record<string, SettlementSummary>
  >({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payerId, setPayerId] = useState("");
  const [items, setItems] = useState<BillItemInput[]>([EMPTY_ITEM()]);
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

  function setShareValue(idx: number, pid: string, value: string) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, shareValues: { ...it.shareValues, [pid]: value } }
          : it,
      ),
    );
  }

  function buildItemsPayload() {
    return items.map((it) => {
      const base = { description: it.description, amount: Number(it.amount) };
      if (it.splitMode === "equal") {
        return { ...base, participants: it.participants };
      }
      return {
        ...base,
        splitMode: it.splitMode,
        shares: it.participants.map((pid) => ({
          personId: pid,
          share: Number(it.shareValues[pid] ?? 0),
        })),
      };
    });
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setItems([EMPTY_ITEM()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      title,
      date,
      payerId,
      items: buildItemsPayload(),
    };

    if (editingId) {
      const res = await fetch(`/api/aa/bills/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload.items }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "保存失败");
        return;
      }
      resetForm();
    } else {
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
      resetForm();
    }
    const bRes = await fetch("/api/aa/bills");
    if (bRes.ok) setBills(await bRes.json());
  }

  async function handleSettle(bill: Bill) {
    setError("");
    const res = await fetch(`/api/aa/bills/${bill.id}/settle`, {
      method: "PATCH",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "操作失败");
      return;
    }
    const bRes = await fetch("/api/aa/bills");
    if (bRes.ok) setBills(await bRes.json());
  }

  async function handleUnsettle(bill: Bill) {
    setError("");
    const res = await fetch(`/api/aa/bills/${bill.id}/unsettle`, {
      method: "PATCH",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "操作失败");
      return;
    }
    const bRes = await fetch("/api/aa/bills");
    if (bRes.ok) setBills(await bRes.json());
  }

  async function startEdit(id: string) {
    const res = await fetch(`/api/aa/bills/${id}`);
    if (!res.ok) return;
    const bill = (await res.json()) as BillDetail;
    setEditingId(id);
    setTitle(bill.title);
    setDate(bill.date);
    setPayerId(bill.payerId);
    setItems(billToForm(bill));
  }

  async function toggleExpand(bill: Bill) {
    if (expandedId === bill.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(bill.id);
    if (!details[bill.id]) {
      const [dRes, sRes] = await Promise.all([
        fetch(`/api/aa/bills/${bill.id}`),
        fetch(`/api/aa/bills/${bill.id}/settlement`),
      ]);
      if (dRes.ok) {
        const d = (await dRes.json()) as BillDetail;
        setDetails((prev) => ({ ...prev, [bill.id]: d }));
      }
      if (sRes.ok) {
        const s = (await sRes.json()) as SettlementSummary;
        setSettlements((prev) => ({ ...prev, [bill.id]: s }));
      }
    }
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
            <select
              value={it.splitMode}
              onChange={(e) =>
                updateItem(idx, { splitMode: e.target.value as SplitMode })
              }
              aria-label={`条目 ${idx + 1} 分摊方式`}
            >
              <option value="equal">均分</option>
              <option value="amount">自定义金额</option>
              <option value="ratio">比例权重</option>
            </select>
            <div>
              {persons.map((p) => (
                <div key={p.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={it.participants.includes(p.id)}
                      onChange={() => toggleParticipant(idx, p.id)}
                      aria-label={`参与人 ${p.name}(条目 ${idx + 1})`}
                    />
                    {p.name}
                  </label>
                  {it.splitMode !== "equal" &&
                    it.participants.includes(p.id) && (
                      <input
                        type="number"
                        min={1}
                        value={it.shareValues[p.id] ?? ""}
                        onChange={(e) => setShareValue(idx, p.id, e.target.value)}
                        placeholder={
                          it.splitMode === "amount" ? "金额(日元)" : "权重,如 2"
                        }
                        aria-label={`${it.splitMode === "amount" ? "份额" : "权重"} ${p.name}(条目 ${idx + 1})`}
                      />
                    )}
                </div>
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
          onClick={() => setItems((prev) => [...prev, EMPTY_ITEM()])}
        >
          添加条目
        </button>
        <button type="submit">{editingId ? "保存修改" : "创建账单"}</button>
        {editingId && (
          <button type="button" onClick={resetForm}>
            取消编辑
          </button>
        )}
      </form>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>加载中…</p>
      ) : (
        <ul>
          {bills.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => toggleExpand(b)}>
                {expandedId === b.id ? "收起" : "展开"}
              </button>{" "}
              {b.title} — ¥{formatYen(b.total)}(垫付:{personName(b.payerId)})
              {b.status === "settled" ? " · 已结算" : ""}{" "}
              {b.status === "open" ? (
                <button type="button" onClick={() => handleSettle(b)}>
                  结算
                </button>
              ) : (
                <button type="button" onClick={() => handleUnsettle(b)}>
                  反结算
                </button>
              )}{" "}
              <button type="button" onClick={() => startEdit(b.id)}>
                编辑
              </button>
              {expandedId === b.id && details[b.id] && (
                <ul>
                  {details[b.id].items.map((it) => (
                    <li key={it.id}>
                      {it.description} ¥{formatYen(it.amount)}[
                      {MODE_LABEL[it.splitMode]}] —{" "}
                      {it.participants
                        .map(
                          (p) =>
                            `${personName(p.personId)} ¥${formatYen(p.share)}`,
                        )
                        .join("、")}
                    </li>
                  ))}
                </ul>
              )}
              {expandedId === b.id && settlements[b.id] && (
                <div>
                  <p>
                    垫付人{personName(settlements[b.id].payerId)}应收合计:¥
                    {formatYen(settlements[b.id].receivable)}
                  </p>
                  <ul>
                    {settlements[b.id].obligations.map((o) => (
                      <li key={o.personId}>
                        {personName(o.personId)}:
                        {o.net > 0
                          ? `应还 ¥${formatYen(o.net)}`
                          : o.net < 0
                            ? `应收 ¥${formatYen(-o.net)}`
                            : "已平"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
