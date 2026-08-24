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

  it("点击账单展开条目明细(描述与份额)", async () => {
    const detail = {
      id: "b1",
      title: "聚餐",
      date: "2026-08-25",
      payerId: "p1",
      status: "open",
      total: 4000,
      items: [
        {
          id: "i1",
          billId: "b1",
          description: "晚餐",
          amount: 4000,
          splitMode: "equal",
          participants: [
            { personId: "p1", share: 2000 },
            { personId: "p2", share: 2000 },
          ],
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/persons")
          return { ok: true, json: async () => PERSONS };
        if (url === "/api/aa/bills")
          return {
            ok: true,
            json: async () => [{ id: "b1", title: "聚餐", date: "2026-08-25", payerId: "p1", status: "open", total: 4000 }],
          };
        if (url === "/api/aa/bills/b1")
          return { ok: true, json: async () => detail };
        if (url === "/api/aa/bills/b1/settlement")
          return {
            ok: true,
            json: async () => ({
              payerId: "p1",
              total: 4000,
              receivable: 2000,
              obligations: [
                { personId: "p1", owed: 2000, net: -2000 },
                { personId: "p2", owed: 2000, net: 2000 },
              ],
            }),
          };
        return { ok: false, json: async () => ({}) };
      }),
    );
    render(<BillManager />);
    const user = userEvent.setup();
    await screen.findByText(/聚餐/);
    await user.click(screen.getByRole("button", { name: /展开/ }));
    expect(await screen.findByText(/晚餐/)).toBeInTheDocument();
    expect(screen.getAllByText(/2,000/).length).toBeGreaterThan(0);
  });

  it("展开账单显示应还/应收结算信息", async () => {
    const detail = {
      id: "b1",
      title: "聚餐",
      date: "2026-08-25",
      payerId: "p1",
      status: "open",
      total: 4000,
      items: [
        {
          id: "i1",
          billId: "b1",
          description: "晚餐",
          amount: 4000,
          splitMode: "equal",
          participants: [
            { personId: "p1", share: 2000 },
            { personId: "p2", share: 2000 },
          ],
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/persons")
          return { ok: true, json: async () => PERSONS };
        if (url === "/api/aa/bills")
          return {
            ok: true,
            json: async () => [{ id: "b1", title: "聚餐", date: "2026-08-25", payerId: "p1", status: "open", total: 4000 }],
          };
        if (url === "/api/aa/bills/b1")
          return { ok: true, json: async () => detail };
        if (url === "/api/aa/bills/b1/settlement")
          return {
            ok: true,
            json: async () => ({
              payerId: "p1",
              total: 4000,
              receivable: 2000,
              obligations: [
                { personId: "p1", owed: 2000, net: -2000 },
                { personId: "p2", owed: 2000, net: 2000 },
              ],
            }),
          };
        return { ok: false, json: async () => ({}) };
      }),
    );
    render(<BillManager />);
    const user = userEvent.setup();
    await screen.findByText(/聚餐/);
    await user.click(screen.getByRole("button", { name: /展开/ }));
    expect(await screen.findByText(/应收合计/)).toBeInTheDocument();
    expect(screen.getByText(/Alice.*应收 ¥2,000/)).toBeInTheDocument();
    expect(screen.getByText(/Bob.*应还 ¥2,000/)).toBeInTheDocument();
  });

  it("结算账单后显示已结算状态,可反结算", async () => {
    let bills = [
      { id: "b1", title: "聚餐", date: "2026-08-25", payerId: "p1", status: "open", total: 4000 },
    ];
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/persons")
        return { ok: true, json: async () => PERSONS };
      if (url === "/api/aa/bills" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => bills };
      if (url === "/api/aa/bills/b1/settle" && opts?.method === "PATCH") {
        bills = [{ ...bills[0], status: "settled" }];
        return { ok: true, json: async () => bills[0] };
      }
      if (url === "/api/aa/bills/b1/unsettle" && opts?.method === "PATCH") {
        bills = [{ ...bills[0], status: "open" }];
        return { ok: true, json: async () => bills[0] };
      }
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BillManager />);
    const user = userEvent.setup();
    await screen.findByText(/聚餐/);
    await user.click(screen.getByRole("button", { name: /结算/ }));
    expect(
      await screen.findByRole("button", { name: "反结算" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText((content: string) => content.includes("已结算")),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /反结算/ }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "反结算" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText((content: string) => content.includes("已结算")),
    ).not.toBeInTheDocument();
  });

  it("编辑账单条目并保存(PUT)", async () => {
    const detail = {
      id: "b1",
      title: "聚餐",
      date: "2026-08-25",
      payerId: "p1",
      status: "open",
      total: 4000,
      items: [
        {
          id: "i1",
          billId: "b1",
          description: "晚餐",
          amount: 4000,
          splitMode: "equal",
          participants: [{ personId: "p1", share: 4000 }],
        },
      ],
    };
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/persons")
        return { ok: true, json: async () => PERSONS };
      if (url === "/api/aa/bills" && (!opts || opts.method === "GET"))
        return {
          ok: true,
          json: async () => [{ id: "b1", title: "聚餐", date: "2026-08-25", payerId: "p1", status: "open", total: 4000 }],
        };
      if (url === "/api/aa/bills/b1" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => detail };
      if (url === "/api/aa/bills/b1" && opts?.method === "PUT")
        return {
          ok: true,
          json: async () => ({ ...detail, total: 5000 }),
        };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BillManager />);
    const user = userEvent.setup();
    await screen.findByText(/聚餐/);
    await user.click(screen.getByRole("button", { name: /编辑/ }));
    await user.clear(screen.getByLabelText("条目 1 金额"));
    await user.type(screen.getByLabelText("条目 1 金额"), "5000");
    await user.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/aa/bills/b1" && (c[1] as RequestInit)?.method === "PUT",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.items[0].amount).toBe(5000);
    });
  });
});
