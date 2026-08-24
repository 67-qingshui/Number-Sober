import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSetup } from "@/components/admin-setup";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("管理员设置组件(首次运行)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("两次密码不一致提示错误", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<AdminSetup />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("管理员密码"), "aaaa");
    await user.type(screen.getByLabelText("确认密码"), "bbbb");
    await user.click(screen.getByRole("button", { name: "完成设置" }));
    expect(await screen.findByText(/不一致/)).toBeInTheDocument();
  });

  it("密码过短提示至少 4 位", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<AdminSetup />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("管理员密码"), "12");
    await user.type(screen.getByLabelText("确认密码"), "12");
    await user.click(screen.getByRole("button", { name: "完成设置" }));
    expect(await screen.findByText(/至少 4 位/)).toBeInTheDocument();
  });

  it("设置成功调用 API 并刷新页面", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSetup />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("管理员密码"), "secret123");
    await user.type(screen.getByLabelText("确认密码"), "secret123");
    await user.click(screen.getByRole("button", { name: "完成设置" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/setup",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });
});
