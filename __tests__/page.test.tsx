import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("健康页", () => {
  it("展示系统名称与运行状态", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /number sober/i })).toBeInTheDocument();
    expect(screen.getByText(/运行正常/i)).toBeInTheDocument();
  });
});
