import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsView } from "@/components/settings-view";

describe("系统设置组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染当前汇率", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/config")
          return { ok: true, json: async () => ({ pointYenRate: 1 }) };
        return { ok: false, json: async () => ({}) };
      }),
    );
    render(<SettingsView />);
    expect(
      await screen.findByText((c) => c.includes("1 积分 =")),
    ).toBeInTheDocument();
  });

  it("修改汇率提交 POST", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/config" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => ({ pointYenRate: 1 }) };
      if (url === "/api/config" && opts?.method === "POST")
        return {
          ok: true,
          json: async () => ({ ok: true, pointYenRate: 2.5 }),
        };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsView />);
    const user = userEvent.setup();
    await screen.findByLabelText("积分汇率(日元)");
    await user.clear(screen.getByLabelText("积分汇率(日元)"));
    await user.type(screen.getByLabelText("积分汇率(日元)"), "2.5");
    await user.click(screen.getByRole("button", { name: "保存汇率" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/config" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.pointYenRate).toBe(2.5);
    });
    expect(await screen.findByText(/已保存/)).toBeInTheDocument();
  });

  it("修改密码提交 POST 并提示成功", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url === "/api/config" && (!opts || opts.method === "GET"))
        return { ok: true, json: async () => ({ pointYenRate: 1 }) };
      if (url === "/api/config" && opts?.method === "POST")
        return { ok: true, json: async () => ({ ok: true }) };
      return { ok: false, json: async () => ({ error: "未知" }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SettingsView />);
    const user = userEvent.setup();
    await screen.findByLabelText("旧密码");
    await user.type(screen.getByLabelText("旧密码"), "secret123");
    await user.type(screen.getByLabelText("新密码"), "newpass456");
    await user.click(screen.getByRole("button", { name: "修改密码" }));
    await waitFor(() => {
      const calls = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/config" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(calls.length).toBe(1);
      const body = JSON.parse((calls[0][1] as RequestInit).body as string);
      expect(body.oldPassword).toBe("secret123");
      expect(body.newPassword).toBe("newpass456");
    });
    expect(await screen.findByText(/密码已修改/)).toBeInTheDocument();
  });
});
