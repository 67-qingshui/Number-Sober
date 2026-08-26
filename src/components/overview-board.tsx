"use client";

import { useEffect, useState } from "react";

interface Overview {
  personCount: number;
  openBills: number;
  receivableTotal: number;
  points: { available: number; pending: number };
  items: { count: number; assetValue: number };
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function OverviewBoard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/overview")
      .then(async (res) => {
        if (res.ok) setData(await res.json());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p>加载中…</p>;
  if (!data) return <p role="alert">加载失败</p>;

  return (
    <section>
      <h1>总览</h1>
      <ul>
        <li>{`参与人:${data.personCount} 人`}</li>
        <li>{`进行中账单:${data.openBills} 单`}</li>
        <li>{`应收合计:${yen(data.receivableTotal)}`}</li>
        <li>
          {`积分:可用 ${data.points.available.toLocaleString()} · 待入账 ${data.points.pending.toLocaleString()}`}
        </li>
        <li>{`物品:${data.items.count} 件 · 资产现值 ${yen(data.items.assetValue)}`}</li>
      </ul>
    </section>
  );
}
