import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// API/页面级测试使用隔离的临时数据库,避免污染项目 .data 目录
process.env.NS_DB_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "ns-test-")),
  "app.db",
);
