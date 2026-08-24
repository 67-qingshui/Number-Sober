import next from "next";
import { createServer } from "node:http";

export interface StartOptions {
  dir?: string;
  dev?: boolean;
  port?: number; // 0 = 随机端口
  hostname?: string;
}

export interface RunningServer {
  port: number;
  close: () => Promise<void>;
}

/**
 * 在进程内启动 Next.js server(供 Electron 主进程与测试使用)。
 * 返回实际监听端口与关闭函数。
 */
export async function startNextServer(opts: StartOptions = {}): Promise<RunningServer> {
  const dir = opts.dir ?? process.cwd();
  const dev = opts.dev ?? false;
  const hostname = opts.hostname ?? "127.0.0.1";

  const app = next({ dev, dir });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = createServer((req, res) => handle(req, res));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, hostname, resolve);
  });

  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : (opts.port ?? 0);

  return {
    port,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.close?.();
    },
  };
}
