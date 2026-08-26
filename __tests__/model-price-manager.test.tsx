import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelPriceManager } from "@/components/model-price-manager";

const PRICES = [
  {
    model: "deepseek-chat",
    inputPrice: 0.27,
    outputPrice: 1.1,
    cacheHitPrice: 0.07,
    createdAt: "",
  },
];

describe("模型单价管理组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染单价列表", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => PRICES }),
    );
    render(<ModelPriceManager />);
    expect(await screen.findByText(/deepseek-chat/)).toBeInTheDocument();
    expect(screen.getByText(/输入 \$0\.27/)).toBeInTheDocument();
    expect(screen.getByText(/输出 \$1\.1/)).toBeInTheDocument();
  });

  it("添加模型单价提交 POST", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/model-prices" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => [] };
      if (url === "/api/model-prices" && opts?.method === "POST")
        return { ok: true, json: async () => ({ model: "m1" }) };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ModelPriceManager />);
    const user = userEvent.setup();
    await screen.findByLabelText("模型名");
    await user.type(screen.getByLabelText("模型名"), "gpt-4o");
    await user.type(screen.getByLabelText("输入单价"), "2.5");
    await user.type(screen.getByLabelText("输出单价"), "10");
    await user.type(screen.getByLabelText("缓存命中单价"), "1.25");
    await user.click(screen.getByRole("button", { name: "保存单价" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) =>
          c[0] === "/api/model-prices" &&
          (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.model).toBe("gpt-4o");
      expect(body.inputPrice).toBe(2.5);
    });
  });

  it("删除模型单价", async () => {
    let deleted = false;
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/model-prices" && (!opts || opts.method === "GET"))
        return {
          ok: true,
          json: async () => (deleted ? [] : PRICES),
        };
      if (
        url === "/api/model-prices/deepseek-chat" &&
        opts?.method === "DELETE"
      ) {
        deleted = true;
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ModelPriceManager />);
    const user = userEvent.setup();
    await screen.findByText(/deepseek-chat/);
    await user.click(screen.getByRole("button", { name: "删除" }));
    await waitFor(() =>
      expect(screen.queryByText(/deepseek-chat/)).not.toBeInTheDocument(),
    );
  });
});
