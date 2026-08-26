"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/overview", label: "总览" },
  { href: "/aa", label: "AA 账单" },
  { href: "/persons", label: "参与人" },
  { href: "/items", label: "物品" },
  { href: "/token", label: "Token" },
  { href: "/points", label: "积分" },
  { href: "/model-prices", label: "单价" },
  { href: "/settings", label: "设置" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        gap: 2,
        background: "rgba(120, 120, 128, 0.12)",
        borderRadius: 9,
        padding: 2,
      }}
      aria-label="主导航"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "5px 13px",
              borderRadius: 7,
              fontSize: 13.5,
              fontWeight: active ? 600 : 400,
              textDecoration: "none",
              color: active ? "var(--foreground)" : "var(--muted-foreground)",
              background: active ? "var(--card)" : "transparent",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
