import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TokenManager } from "@/components/token-manager";

describe("Token 管理组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染录入列表(含各类 token 与成本)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/token-entries")
          return {
            ok: true,
            json: async () => [
              {
                id: "1",
                date: "2026-08-25",
                provider: "deepseek",
                model: "deepseek-chat",
                inputTokens: 1000,
                cacheHitTokens: 200,
                outputTokens: 500,
                cost: 0.15,
                createdAt: "",
              },
            ],
          };
        if (url === "/api/token-entries/stats")
          return {
            ok: true,
            json: async () => ({
              totals: { inputTokens: 0, cacheHitTokens: 0, outputTokens: 0, cost: 0 },
              byDay: [],
              byModel: [],
            }),
          };
        return { ok: false, json: async () => ({}) };
      }),
    );
    render(<TokenManager />);
    expect(await screen.findByText(/deepseek\/deepseek-chat/)).toBeInTheDocument();
    expect(screen.getByText(/输入 1,000/)).toBeInTheDocument();
  });

  it("录入新条目提交 POST", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/token-entries" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => [] };
      if (url === "/api/token-entries/stats")
        return {
          ok: true,
          json: async () => ({
            totals: { inputTokens: 0, cacheHitTokens: 0, outputTokens: 0, cost: 0 },
            byDay: [],
            byModel: [],
          }),
        };
      if (url === "/api/token-entries" && opts?.method === "POST")
        return { ok: true, json: async () => ({ id: "n1" }) };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TokenManager />);
    const user = userEvent.setup();
    await screen.findByLabelText("提供商");
    await user.type(screen.getByLabelText("提供商"), "deepseek");
    await user.type(screen.getByLabelText("模型"), "deepseek-chat");
    await user.type(screen.getByLabelText("输入 Tokens"), "1000");
    await user.type(screen.getByLabelText("缓存命中 Tokens"), "200");
    await user.type(screen.getByLabelText("输出 Tokens"), "500");
    await user.type(screen.getByLabelText("成本"), "0.15");
    await user.click(screen.getByRole("button", { name: "录入" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) =>
          c[0] === "/api/token-entries" &&
          (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.inputTokens).toBe(1000);
      expect(body.cost).toBe(0.15);
    });
  });

  it("渲染统计总计与按天/按模型聚合", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/token-entries")
          return {
            ok: true,
            json: async () => [
              {
                id: "1",
                date: "2026-08-25",
                provider: "deepseek",
                model: "deepseek-chat",
                inputTokens: 1000,
                cacheHitTokens: 200,
                outputTokens: 500,
                cost: 0.15,
                createdAt: "",
              },
            ],
          };
        if (url === "/api/token-entries/stats")
          return {
            ok: true,
            json: async () => ({
              totals: { inputTokens: 1000, cacheHitTokens: 200, outputTokens: 500, cost: 0.15 },
              byDay: [
                { key: "2026-08-25", inputTokens: 1000, cacheHitTokens: 200, outputTokens: 500, cost: 0.15 },
              ],
              byModel: [
                { key: "deepseek-chat", inputTokens: 1000, cacheHitTokens: 200, outputTokens: 500, cost: 0.15 },
              ],
            }),
          };
        return { ok: false, json: async () => ({}) };
      }),
    );
    render(<TokenManager />);
    expect(await screen.findByText(/总计/)).toBeInTheDocument();
    expect(screen.getAllByText(/输入 1,000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/按天统计/)).toBeInTheDocument();
    expect(screen.getByText(/按模型统计/)).toBeInTheDocument();
  });
});
