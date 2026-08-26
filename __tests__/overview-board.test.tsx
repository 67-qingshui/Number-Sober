import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewBoard } from "@/components/overview-board";

describe("总览仪表盘组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染各模块汇总数据", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          personCount: 3,
          openBills: 2,
          receivableTotal: 3000,
          points: { available: 100, pending: 400 },
          items: { count: 1, assetValue: 110000 },
        }),
      }),
    );
    render(<OverviewBoard />);
    expect(await screen.findByText(/参与人:3 人/)).toBeInTheDocument();
    expect(screen.getByText(/进行中账单:2 单/)).toBeInTheDocument();
    expect(screen.getByText(/应收合计:¥3,000/)).toBeInTheDocument();
    expect(
      screen.getByText((c) => c.includes("可用 100")),
    ).toBeInTheDocument();
    expect(
      screen.getByText((c) => c.includes("资产现值 ¥110,000")),
    ).toBeInTheDocument();
  });

  it("加载失败显示错误", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    render(<OverviewBoard />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
