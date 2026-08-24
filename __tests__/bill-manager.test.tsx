import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillManager } from "@/components/bill-manager";

const PERSONS = [
  { id: "p1", name: "Alice", note: "", createdAt: "" },
  { id: "p2", name: "Bob", note: "", createdAt: "" },
];

describe("AA 账单组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchWith(created: unknown) {
    let bills: unknown[] = [];
    return vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/persons")
        return { ok: true, json: async () => PERSONS };
      if (url === "/api/aa/bills" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => bills };
      if (url === "/api/aa/bills" && opts?.method === "POST") {
        bills = [created];
        return { ok: true, json: async () => created };
      }
      return { ok: false, json: async () => ({ error: "未知请求" }) };
    });
  }

  it("渲染账单列表(标题与金额)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/persons")
          return { ok: true, json: async () => PERSONS };
        return {
          ok: true,
          json: async () => [
            { id: "b1", title: "聚餐", date: "2026-08-25", payerId: "p1", status: "open", total: 4000 },
          ],
        };
      }),
    );
    render(<BillManager />);
    expect(await screen.findByText(/聚餐/)).toBeInTheDocument();
    expect(await screen.findByText(/4,000/)).toBeInTheDocument();
  });

  it("创建账单:填表、加条目、勾选参与人、提交", async () => {
    const created = {
      id: "b2",
      title: "旅行",
      date: "2026-08-25",
      payerId: "p1",
      status: "open",
      total: 5000,
    };
    const fetchMock = mockFetchWith(created);
    vi.stubGlobal("fetch", fetchMock);
    render(<BillManager />);
    const user = userEvent.setup();

    await screen.findByLabelText("标题");
    await user.type(screen.getByLabelText("标题"), "旅行");
    await user.selectOptions(screen.getByLabelText("垫付人"), "p1");
    await user.type(screen.getByLabelText("条目 1 描述"), "住宿");
    await user.type(screen.getByLabelText("条目 1 金额"), "5000");
    await user.click(screen.getByLabelText("参与人 Alice(条目 1)"));

    await user.click(screen.getByRole("button", { name: "创建账单" }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/aa/bills" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.title).toBe("旅行");
      expect(body.items[0].amount).toBe(5000);
      expect(body.items[0].participants).toContain("p1");
    });
    expect(await screen.findByText(/旅行/)).toBeInTheDocument();
  });

  it("amount 模式:勾选参与人并填自定义金额提交", async () => {
    const created = {
      id: "b3",
      title: "购物",
      date: "2026-08-25",
      payerId: "p1",
      status: "open",
      total: 5000,
    };
    const fetchMock = mockFetchWith(created);
    vi.stubGlobal("fetch", fetchMock);
    render(<BillManager />);
    const user = userEvent.setup();

    await screen.findByLabelText("标题");
    await user.type(screen.getByLabelText("标题"), "购物");
    await user.selectOptions(screen.getByLabelText("垫付人"), "p1");
    await user.type(screen.getByLabelText("条目 1 描述"), "购物");
    await user.type(screen.getByLabelText("条目 1 金额"), "5000");
    await user.selectOptions(
      screen.getByLabelText("条目 1 分摊方式"),
      "amount",
    );
    await user.click(screen.getByLabelText("参与人 Alice(条目 1)"));
    await user.click(screen.getByLabelText("参与人 Bob(条目 1)"));
    await user.type(screen.getByLabelText("份额 Alice(条目 1)"), "3000");
    await user.type(screen.getByLabelText("份额 Bob(条目 1)"), "2000");

    await user.click(screen.getByRole("button", { name: "创建账单" }));

    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/aa/bills" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.items[0].splitMode).toBe("amount");
      expect(body.items[0].shares).toEqual([
        { personId: "p1", share: 3000 },
        { personId: "p2", share: 2000 },
      ]);
    });
  });
});
