import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/login-form";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("登录表单", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  it("密码错误显示提示", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("密码"), "wrong");
    await user.click(screen.getByRole("button", { name: "登录" }));
    expect(await screen.findByText(/密码错误/)).toBeInTheDocument();
  });

  it("登录成功跳转到首页", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }),
    );
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("密码"), "secret123");
    await user.click(screen.getByRole("button", { name: "登录" }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });
});
