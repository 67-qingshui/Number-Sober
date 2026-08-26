import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  upsertModelPrice,
  listModelPrices,
  deleteModelPrice,
} from "@/server/model-prices";

describe("模型单价服务", () => {
  let dbFile: string;

  beforeEach(() => {
    dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ns-")), "mp.db");
  });

  it("新增模型单价并持久化", () => {
    const p = upsertModelPrice(
      { model: "deepseek-chat", inputPrice: 0.27, outputPrice: 1.1, cacheHitPrice: 0.07 },
      dbFile,
    );
    expect(p.model).toBe("deepseek-chat");
    expect(p.inputPrice).toBe(0.27);
    expect(listModelPrices(dbFile)).toHaveLength(1);
  });

  it("同模型重复 upsert 覆盖旧值", () => {
    upsertModelPrice(
      { model: "deepseek-chat", inputPrice: 0.27, outputPrice: 1.1 },
      dbFile,
    );
    upsertModelPrice(
      { model: "deepseek-chat", inputPrice: 0.5, outputPrice: 2.0 },
      dbFile,
    );
    const list = listModelPrices(dbFile);
    expect(list).toHaveLength(1);
    expect(list[0].inputPrice).toBe(0.5);
  });

  it("缓存命中单价可省略(默认 0)", () => {
    const p = upsertModelPrice(
      { model: "m", inputPrice: 1, outputPrice: 2 },
      dbFile,
    );
    expect(p.cacheHitPrice).toBe(0);
  });

  it("空模型名抛错", () => {
    expect(() =>
      upsertModelPrice({ model: " ", inputPrice: 1, outputPrice: 2 }, dbFile),
    ).toThrow(/模型/);
  });

  it("负数单价抛错", () => {
    expect(() =>
      upsertModelPrice({ model: "m", inputPrice: -1, outputPrice: 2 }, dbFile),
    ).toThrow(/单价/);
  });

  it("删除模型单价", () => {
    upsertModelPrice({ model: "m", inputPrice: 1, outputPrice: 2 }, dbFile);
    deleteModelPrice("m", dbFile);
    expect(listModelPrices(dbFile)).toHaveLength(0);
  });
});
