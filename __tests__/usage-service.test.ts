import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createItem } from "@/server/items";
import {
  addUsageRecord,
  listUsageRecords,
} from "@/server/usage";

describe("使用记录服务", () => {
  let dbFile: string;
  let itemId: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "u.db");
    itemId = createItem(
      { name: "打印机", category: "asset", purchasePrice: 120000, purchaseDate: "2026-01-15", lifespanMonths: 24 },
      dbFile,
    ).id;
  });

  it("添加使用记录并持久化", () => {
    const rec = addUsageRecord(
      { itemId, startAt: "2026-08-01T10:00:00", endAt: "2026-08-01T12:00:00", note: "打印文档" },
      dbFile,
    );
    expect(rec.id).toBeTruthy();
    expect(rec.note).toBe("打印文档");
    expect(listUsageRecords(itemId, dbFile)).toHaveLength(1);
  });

  it("备注可选", () => {
    const rec = addUsageRecord(
      { itemId, startAt: "2026-08-01T10:00:00", endAt: "2026-08-01T10:30:00" },
      dbFile,
    );
    expect(rec.note).toBe("");
  });

  it("结束早于开始抛错", () => {
    expect(() =>
      addUsageRecord(
        { itemId, startAt: "2026-08-01T12:00:00", endAt: "2026-08-01T10:00:00" },
        dbFile,
      ),
    ).toThrow(/结束/);
  });

  it("物品不存在抛错", () => {
    expect(() =>
      addUsageRecord(
        { itemId: "no-such", startAt: "2026-08-01T10:00:00", endAt: "2026-08-01T11:00:00" },
        dbFile,
      ),
    ).toThrow(/物品/);
  });

  it("列表按开始时间倒序", () => {
    addUsageRecord(
      { itemId, startAt: "2026-08-01T10:00:00", endAt: "2026-08-01T11:00:00" },
      dbFile,
    );
    addUsageRecord(
      { itemId, startAt: "2026-08-02T10:00:00", endAt: "2026-08-02T12:00:00" },
      dbFile,
    );
    const list = listUsageRecords(itemId, dbFile);
    expect(list).toHaveLength(2);
    expect(list[0].startAt).toBe("2026-08-02T10:00:00");
  });
});
