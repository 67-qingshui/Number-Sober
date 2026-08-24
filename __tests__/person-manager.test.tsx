import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonManager } from "@/components/person-manager";

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
});
