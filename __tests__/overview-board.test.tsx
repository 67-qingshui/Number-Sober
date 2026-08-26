import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewBoard } from "@/components/overview-board";

const OVERVIEW = {
  personCount: 3,
  openBills: 2,
  receivableTotal: 3000,
  points: { available: 100, pending: 400 },
  items: { count: 1, assetValue: 110000 },
};

describe("总览仪表盘组件", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("渲染各模块汇总数据", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => OVERVIEW,
      }),
    );
    render(<OverviewBoard />);
    // 卡片标题
    expect(await screen.findByText("参与人")).toBeInTheDocument();
    expect(screen.getByText("AA 账单")).toBeInTheDocument();
    // 参与人数量
    expect(screen.getByText("3 人")).toBeInTheDocument();
    // 账单进行中(strong 拆分,查数字与文案分别存在)
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText((c) => c.includes("单进行中"))).toBeInTheDocument();
    expect(screen.getByText(/应收 ¥3,000/)).toBeInTheDocument();
    // 积分
    expect(screen.getByText((c) => c.includes("可用"))).toBeInTheDocument();
    // 资产现值
    expect(screen.getByText(/现值 ¥110,000/)).toBeInTheDocument();
  });

  it("空数据显示引导文案而非零值", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          personCount: 0,
          openBills: 0,
          receivableTotal: 0,
          points: { available: 0, pending: 0 },
          items: { count: 0, assetValue: 0 },
        }),
      }),
    );
    render(<OverviewBoard />);
    expect(await screen.findByText(/添加共同分账的伙伴/)).toBeInTheDocument();
    expect(screen.getByText(/创建第一笔账单/)).toBeInTheDocument();
    expect(screen.getByText(/开始使用/)).toBeInTheDocument();
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
