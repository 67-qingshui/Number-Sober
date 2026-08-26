import { describe, it, expect } from "vitest";
import { buildCalendar } from "@/lib/points-calendar";

describe("延迟到账日历", () => {
  const entries = [
    {
      id: "e1",
      date: "2026-08-25",
      description: "a(延迟)",
      amount: 400,
      availableAt: "2026-09-24T00:00:00.000Z",
      kind: "earn",
      createdAt: "",
    },
    {
      id: "e2",
      date: "2026-08-26",
      description: "b(延迟)",
      amount: 1000,
      availableAt: "2026-09-25T00:00:00.000Z",
      kind: "earn",
      createdAt: "",
    },
    {
      id: "e3",
      date: "2026-08-20",
      description: "c(延迟)",
      amount: 250,
      availableAt: "2026-09-24T12:00:00.000Z",
      kind: "earn",
      createdAt: "",
    },
    // 已到账的条目不出现在日历
    {
      id: "e4",
      date: "2026-08-01",
      description: "d(立即)",
      amount: 100,
      availableAt: null,
      kind: "earn",
      createdAt: "",
    },
  ];

  it("按到期日分组,同日合并金额", () => {
    const cal = buildCalendar(entries);
    expect(cal).toHaveLength(2);
    const d24 = cal.find((c) => c.date === "2026-09-24")!;
    expect(d24.total).toBe(650); // 400 + 250
    const d25 = cal.find((c) => c.date === "2026-09-25")!;
    expect(d25.total).toBe(1000);
  });

  it("按日期升序排列", () => {
    const cal = buildCalendar(entries);
    expect(cal[0].date).toBe("2026-09-24");
    expect(cal[1].date).toBe("2026-09-25");
  });

  it("全部已到账时日历为空", () => {
    expect(buildCalendar([entries[3]])).toEqual([]);
    expect(buildCalendar([])).toEqual([]);
  });

  it("负数条目(兑换)不计入日历", () => {
    const withRedeem = [
      ...entries,
      {
        id: "e5",
        date: "2026-08-27",
        description: "兑换",
        amount: -500,
        availableAt: null,
        kind: "redeem",
        createdAt: "",
      },
    ];
    expect(buildCalendar(withRedeem)).toHaveLength(2);
  });
});
