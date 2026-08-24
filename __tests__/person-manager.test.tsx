import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonManager } from "@/components/person-manager";

const ONE_PERSON = [{ id: "1", name: "小明", note: "室友", createdAt: "" }];

describe("参与人管理组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("加载并展示参与人列表", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: "1", name: "小明", note: "室友", createdAt: "" }],
      }),
    );
    render(<PersonManager />);
    expect(await screen.findByText(/小明/)).toBeInTheDocument();
    expect(screen.getByText(/室友/)).toBeInTheDocument();
  });

  it("提交表单创建参与人并刷新列表", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "2", name: "小红", note: "", createdAt: "" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "2", name: "小红", note: "", createdAt: "" }],
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonManager />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "姓名" }), "小红");
    await user.click(screen.getByRole("button", { name: "新建" }));
    expect(await screen.findByText(/小红/)).toBeInTheDocument();
  });

  it("空姓名提交显示错误提示", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "姓名不能为空" }),
        }),
    );
    render(<PersonManager />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "新建" }));
    expect(await screen.findByText(/姓名不能为空/)).toBeInTheDocument();
  });

  it("编辑参与人并保存,列表显示新姓名", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ONE_PERSON })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "1", name: "大明", note: "室友", createdAt: "" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "1", name: "大明", note: "室友", createdAt: "" }],
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonManager />);
    const user = userEvent.setup();
    await screen.findByText(/小明/);
    await user.click(screen.getByRole("button", { name: /编辑/ }));
    await user.clear(screen.getByRole("textbox", { name: "编辑姓名" }));
    await user.type(screen.getByRole("textbox", { name: "编辑姓名" }), "大明");
    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText(/大明/)).toBeInTheDocument();
  });

  it("删除参与人后列表移除", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ONE_PERSON })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonManager />);
    const user = userEvent.setup();
    await screen.findByText(/小明/);
    await user.click(screen.getByRole("button", { name: /删除/ }));
    await waitFor(() =>
      expect(screen.queryByText(/小明/)).not.toBeInTheDocument(),
    );
  });

  it("删除被引用的参与人显示错误", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ONE_PERSON })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "该参与人已被AA账单引用,无法删除" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<PersonManager />);
    const user = userEvent.setup();
    await screen.findByText(/小明/);
    await user.click(screen.getByRole("button", { name: /删除/ }));
    expect(await screen.findByText(/无法删除/)).toBeInTheDocument();
  });
});
