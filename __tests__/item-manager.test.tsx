import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemManager } from "@/components/item-manager";

const ITEMS = [
  {
    id: "i1",
    name: "打印机",
    category: "asset",
    purchasePrice: 120000,
    purchaseDate: "2026-01-15",
    lifespanMonths: 24,
    stock: null,
    createdAt: "",
  },
  {
    id: "i2",
    name: "墨盒",
    category: "consumable",
    purchasePrice: 3000,
    purchaseDate: "2026-08-01",
    lifespanMonths: null,
    stock: 5,
    createdAt: "",
  },
];

describe("物品管理组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染物品列表,资产显示月摊销与剩余价值,消耗品显示库存", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ITEMS }),
    );
    render(<ItemManager />);
    expect(await screen.findByText(/打印机/)).toBeInTheDocument();
    expect(screen.getByText(/月摊销 ¥5,000/)).toBeInTheDocument();
    expect(screen.getByText(/剩余 ¥85,000/)).toBeInTheDocument();
    expect(screen.getByText(/墨盒/)).toBeInTheDocument();
    expect(screen.getByText(/库存 5/)).toBeInTheDocument();
  });

  it("新建资产物品并提交", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/items" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => [] };
      if (url === "/api/items" && opts?.method === "POST")
        return { ok: true, json: async () => ({ id: "n1" }) };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ItemManager />);
    const user = userEvent.setup();
    await screen.findByLabelText("物品名称");
    await user.type(screen.getByLabelText("物品名称"), "显示器");
    await user.selectOptions(screen.getByLabelText("类别"), "asset");
    await user.type(screen.getByLabelText("购买价格"), "80000");
    await user.type(screen.getByLabelText("购买日期"), "2026-08-01");
    await user.type(screen.getByLabelText("寿命月数"), "36");
    await user.click(screen.getByRole("button", { name: "添加物品" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/items" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.name).toBe("显示器");
      expect(body.lifespanMonths).toBe(36);
    });
  });

  it("删除物品后列表移除", async () => {
    let deleted = false;
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/items" && (!opts || opts.method === "GET"))
        return {
          ok: true,
          json: async () => (deleted ? ITEMS.filter((i) => i.id !== "i1") : ITEMS),
        };
      if (url === "/api/items/i1" && opts?.method === "DELETE") {
        deleted = true;
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ItemManager />);
    const user = userEvent.setup();
    await screen.findByText(/打印机/);
    await user.click(screen.getAllByRole("button", { name: "删除" })[0]);
    await waitFor(() =>
      expect(screen.queryByText(/打印机/)).not.toBeInTheDocument(),
    );
  });
});
