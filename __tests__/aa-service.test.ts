import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPerson } from "@/server/persons";
import { createBill, listBills } from "@/server/aa";

describe("AA 账单服务", () => {
  let dbFile: string;
  let alice: string;
  let bob: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "aa.db");
    alice = createPerson({ name: "Alice" }, dbFile).id;
    bob = createPerson({ name: "Bob" }, dbFile).id;
  });

  it("创建账单(均分条目)并持久化", () => {
    const bill = createBill(
      {
        title: "聚餐",
        date: "2026-08-25",
        payerId: alice,
        items: [
          {
            description: "晚餐",
            amount: 4000,
            participants: [alice, bob],
          },
        ],
      },
      dbFile,
    );
    expect(bill.id).toBeTruthy();
    expect(bill.title).toBe("聚餐");
    expect(bill.payerId).toBe(alice);
    expect(bill.total).toBe(4000);
    expect(bill.items).toHaveLength(1);
    expect(bill.items[0].participants).toHaveLength(2);
  });

  it("多条目金额合计正确", () => {
    const bill = createBill(
      {
        title: "旅行",
        date: "2026-08-25",
        payerId: alice,
        items: [
          { description: "住宿", amount: 3000, participants: [alice, bob] },
          { description: "车票", amount: 2000, participants: [alice, bob] },
        ],
      },
      dbFile,
    );
    expect(bill.total).toBe(5000);
  });

  it("空标题抛错", () => {
    expect(() =>
      createBill(
        {
          title: "   ",
          date: "2026-08-25",
          payerId: alice,
          items: [
            { description: "晚餐", amount: 100, participants: [alice] },
          ],
        },
        dbFile,
      ),
    ).toThrow(/标题/);
  });

  it("空条目列表抛错", () => {
    expect(() =>
      createBill(
        { title: "测试", date: "2026-08-25", payerId: alice, items: [] },
        dbFile,
      ),
    ).toThrow(/条目/);
  });

  it("金额非正数抛错", () => {
    expect(() =>
      createBill(
        {
          title: "测试",
          date: "2026-08-25",
          payerId: alice,
          items: [{ description: "x", amount: 0, participants: [alice] }],
        },
        dbFile,
      ),
    ).toThrow(/金额/);
  });

  it("垫付人不存在抛错", () => {
    expect(() =>
      createBill(
        {
          title: "测试",
          date: "2026-08-25",
          payerId: "no-such",
          items: [{ description: "x", amount: 100, participants: [alice] }],
        },
        dbFile,
      ),
    ).toThrow(/垫付/);
  });

  it("listBills 返回全部账单,新单在前", () => {
    createBill(
      { title: "第一单", date: "2026-08-01", payerId: alice, items: [{ description: "a", amount: 100, participants: [alice] }] },
      dbFile,
    );
    createBill(
      { title: "第二单", date: "2026-08-02", payerId: bob, items: [{ description: "b", amount: 200, participants: [bob] }] },
      dbFile,
    );
    const bills = listBills(dbFile);
    expect(bills).toHaveLength(2);
    expect(bills[0].title).toBe("第二单");
  });

  it("amount 模式:按自定义金额分摊", () => {
    const bill = createBill(
      {
        title: "定制",
        date: "2026-08-25",
        payerId: alice,
        items: [
          {
            description: "购物",
            amount: 5000,
            splitMode: "amount",
            shares: [
              { personId: alice, share: 3000 },
              { personId: bob, share: 2000 },
            ],
          },
        ],
      },
      dbFile,
    );
    expect(bill.items[0].splitMode).toBe("amount");
    expect(bill.items[0].participants).toEqual([
      { personId: alice, share: 3000 },
      { personId: bob, share: 2000 },
    ]);
  });

  it("amount 模式份额和与金额不符抛错", () => {
    expect(() =>
      createBill(
        {
          title: "定制",
          date: "2026-08-25",
          payerId: alice,
          items: [
            {
              description: "购物",
              amount: 5000,
              splitMode: "amount",
              shares: [
                { personId: alice, share: 3000 },
                { personId: bob, share: 1000 },
              ],
            },
          ],
        },
        dbFile,
      ),
    ).toThrow(/合计/);
  });

  it("ratio 模式:按权重分摊", () => {
    const bill = createBill(
      {
        title: "按比例",
        date: "2026-08-25",
        payerId: alice,
        items: [
          {
            description: "房租",
            amount: 5000,
            splitMode: "ratio",
            shares: [
              { personId: alice, share: 3 },
              { personId: bob, share: 2 },
            ],
          },
        ],
      },
      dbFile,
    );
    expect(bill.items[0].splitMode).toBe("ratio");
    expect(bill.items[0].participants).toEqual([
      { personId: alice, share: 3000 },
      { personId: bob, share: 2000 },
    ]);
  });

  it("shares 引用不存在的参与人抛错", () => {
    expect(() =>
      createBill(
        {
          title: "异常",
          date: "2026-08-25",
          payerId: alice,
          items: [
            {
              description: "x",
              amount: 100,
              splitMode: "amount",
              shares: [{ personId: "no-such", share: 100 }],
            },
          ],
        },
        dbFile,
      ),
    ).toThrow(/参与人不存在/);
  });
});
