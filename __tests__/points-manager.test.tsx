import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PointsManager } from "@/components/points-manager";

const ENTRIES = [
  {
    id: "e1",
    date: "2026-08-25",
    description: "购物(立即)",
    amount: 100,
    availableAt: null,
    kind: "earn",
    createdAt: "",
  },
  {
    id: "e2",
    date: "2026-08-25",
    description: "购物(延迟)",
    amount: 400,
    availableAt: "2026-09-24T00:00:00.000Z",
    kind: "earn",
    createdAt: "",
  },
];

describe("积分管理组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染积分条目(立即与延迟)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/points")
          return { ok: true, json: async () => ENTRIES };
        if (url === "/api/points/balance")
          return {
            ok: true,
            json: async () => ({ available: 100, pending: 400 }),
          };
        return { ok: false, json: async () => ({}) };
      }),
    );
    render(<PointsManager />);
    expect(await screen.findByText(/购物\(立即\)/)).toBeInTheDocument();
    expect(screen.getByText(/购物\(延迟\)/)).toBeInTheDocument();
    expect(screen.getByText(/2026-09-24 到账/)).toBeInTheDocument();
    expect(screen.getByText(/可用 100/)).toBeInTheDocument();
    expect(screen.getByText(/待入账 400/)).toBeInTheDocument();
  });

  it("点击结算按钮调用结算 API 并刷新余额", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/points" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => ENTRIES };
      if (url === "/api/points/balance" && (!opts || opts.method === "GET"))
        return {
          ok: true,
          json: async () => ({ available: 500, pending: 0 }),
        };
      if (url === "/api/points/balance" && opts?.method === "POST")
        return {
          ok: true,
          json: async () => ({
            settled: 400,
            balance: { available: 500, pending: 0 },
          }),
        };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PointsManager />);
    const user = userEvent.setup();
    await screen.findByText((c) => c.includes("可用 500"));
    await user.click(screen.getByRole("button", { name: "结算到期积分" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) =>
          c[0] === "/api/points/balance" &&
          (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
    });
    expect(await screen.findByText((c) => c.includes("可用 500"))).toBeInTheDocument();
  });

  it("记录消费并提交返积分规则", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/points" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => [] };
      if (url === "/api/points" && opts?.method === "POST")
        return {
          ok: true,
          json: async () => ({
            earnback: { total: 500, immediate: 100, delayed: 400 },
          }),
        };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<PointsManager />);
    const user = userEvent.setup();
    await screen.findByLabelText("消费描述");
    await user.type(screen.getByLabelText("消费描述"), "购物");
    await user.type(screen.getByLabelText("消费金额"), "10000");
    // 默认已填 5/20/30,先清空再输入目标值
    await user.clear(screen.getByLabelText("返现比例%"));
    await user.type(screen.getByLabelText("返现比例%"), "5");
    await user.clear(screen.getByLabelText("立即到账比例%"));
    await user.type(screen.getByLabelText("立即到账比例%"), "20");
    await user.clear(screen.getByLabelText("延迟天数"));
    await user.type(screen.getByLabelText("延迟天数"), "30");
    await user.click(screen.getByRole("button", { name: "记录消费" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/points" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.amount).toBe(10000);
      expect(body.rule.ratePct).toBe(5);
      expect(body.rule.immediatePct).toBe(20);
      expect(body.rule.delayDays).toBe(30);
    });
    expect(await screen.findByText(/返 500 积分/)).toBeInTheDocument();
  });
});
