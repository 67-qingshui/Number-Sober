import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthView } from "@/components/health-view";

describe("健康页", () => {
  it("展示系统名称与数据库连接状态", () => {
    render(<HealthView status={{ dbConnected: true, schemaVersion: "1" }} />);
    expect(screen.getByRole("heading", { name: /number sober/i })).toBeInTheDocument();
    expect(screen.getByText(/运行正常/i)).toBeInTheDocument();
    expect(screen.getByText(/schema v1/i)).toBeInTheDocument();
  });

  it("数据库未连接时给出提示", () => {
    render(<HealthView status={{ dbConnected: false, schemaVersion: "" }} />);
    expect(screen.getByText(/未连接/i)).toBeInTheDocument();
  });
});
