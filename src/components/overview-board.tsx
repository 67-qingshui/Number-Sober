"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

const CARDS = [
  {
    key: "persons",
    title: "参与人",
    href: "/persons",
    empty: "添加共同分账的伙伴",
  },
  {
    key: "aa",
    title: "AA 账单",
    href: "/aa",
    empty: "创建第一笔账单",
  },
  { key: "items", title: "物品", href: "/items", empty: "登记资产与消耗品" },
  { key: "token", title: "Token 利用", href: "/token", empty: "录入 AI 用量" },
  { key: "points", title: "积分", href: "/points", empty: "记录消费返现" },
] as const;

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

  if (loading)
    return (
      <p style={{ color: "var(--muted-foreground)", padding: "40px 0" }}>
        加载中…
      </p>
    );
  if (!data) return <p role="alert">加载失败</p>;

  const values: Record<string, React.ReactNode> = {
    persons: `${data.personCount} 人`,
    aa: (
      <>
        <strong>{data.openBills}</strong> 单进行中
        {data.receivableTotal > 0 && (
          <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
            {" "}
            · 应收 {yen(data.receivableTotal)}
          </span>
        )}
      </>
    ),
    items: (
      <>
        <strong>{data.items.count}</strong> 件
        {data.items.assetValue > 0 && (
          <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
            {" "}
            · 现值 {yen(data.items.assetValue)}
          </span>
        )}
      </>
    ),
    token: null,
    points: (
      <>
        可用 <strong>{data.points.available.toLocaleString()}</strong>
        {data.points.pending > 0 && (
          <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
            {" "}
            · 待入账 {data.points.pending.toLocaleString()}
          </span>
        )}
      </>
    ),
  };

  return (
    <section>
      <h1>总览</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        {CARDS.map((card, i) => {
          const isEmpty =
            (card.key === "persons" && data.personCount === 0) ||
            (card.key === "aa" && data.openBills === 0) ||
            (card.key === "items" && data.items.count === 0) ||
            (card.key === "points" &&
              data.points.available === 0 &&
              data.points.pending === 0);
          return (
            <Link
              key={card.key}
              href={card.href}
              className="overview-card"
              style={{
                animationDelay: `${i * 0.05}s`,
                background:
                  card.key === "points"
                    ? "linear-gradient(135deg, var(--pink-soft), #fff)"
                    : card.key === "items"
                      ? "linear-gradient(135deg, var(--accent-soft), #fff)"
                      : "var(--card)",
              }}
            >
              <span className="ov-title">{card.title}</span>
              <span className="ov-value">
                {isEmpty ? card.empty : values[card.key]}
              </span>
            </Link>
          );
        })}
        {/* Token 卡片单独渲染(无汇总字段时显示入口) */}
        <Link
          href="/token"
          className="overview-card"
          style={{ background: "var(--card)", animationDelay: "0.25s" }}
        >
          <span className="ov-title">Token 利用</span>
          <span className="ov-value">录入 AI 用量与成本 →</span>
        </Link>
      </div>

      {data.personCount === 0 && (
        <div
          style={{
            marginTop: 20,
            background: "var(--pink-soft)",
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          <h3 style={{ margin: "0 0 6px" }}>开始使用</h3>
          <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
            ① 在{" "}
            <Link href="/persons" style={{ color: "var(--blue)" }}>
              参与人
            </Link>{" "}
            添加成员 → ② 到{" "}
            <Link href="/aa" style={{ color: "var(--blue)" }}>
              AA 账单
            </Link>{" "}
            记第一笔 → ③ 数据会自动出现在这里
          </p>
        </div>
      )}
    </section>
  );
}
