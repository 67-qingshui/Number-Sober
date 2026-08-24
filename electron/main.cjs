const { app, BrowserWindow } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const DEV = !app.isPackaged;
const HOST = "127.0.0.1";
const PORT = 3100;

let serverProc = null;

function canConnect(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: HOST });
    const done = (ok) => {
      sock.destroy();
      resolve(ok);
    };
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
  });
}

async function waitForServer(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(port)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function startNextServer() {
  const nextBin = path.join(
    app.getAppPath(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const base = [nextBin, DEV ? "dev" : "start", "-p", String(PORT), "-H", HOST];
  // dev:系统 node(开发环境必有);prod:Electron 内嵌 node,用户机器无需装 node
  const exec = DEV ? "node" : process.execPath;
  const env = DEV ? process.env : { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
  const child = spawn(exec, base, { env, cwd: app.getAppPath(), stdio: "inherit" });
  child.on("exit", (code) => console.log("[next] exited with", code));
  return child;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Number Sober 明算",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  await win.loadURL(`http://${HOST}:${PORT}`);
}

app.whenReady().then(async () => {
  serverProc = startNextServer();
  const ok = await waitForServer(PORT);
  if (!ok) {
    console.error("Next server 启动超时");
    app.quit();
    return;
  }
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProc) serverProc.kill();
});
