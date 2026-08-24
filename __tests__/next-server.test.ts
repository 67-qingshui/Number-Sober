import { describe, it, expect } from "vitest";
import { startNextServer } from "@/server/next-server";

describe("内嵌 Next server", () => {
  it("启动后能响应页面请求(dev 模式)", async () => {
    const srv = await startNextServer({ dir: process.cwd(), dev: true, port: 0 });
    try {
      const deadline = Date.now() + 45_000;
      let status = 0;
      while (Date.now() < deadline) {
        try {
          const res = await fetch(`http://127.0.0.1:${srv.port}/`, {
            signal: AbortSignal.timeout(4000),
          });
          status = res.status;
          if (status === 200) break;
        } catch {
          // server 未就绪或页面编译中,继续轮询
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      expect(status).toBe(200);
    } finally {
      await srv.close();
    }
  }, 60_000);
});
