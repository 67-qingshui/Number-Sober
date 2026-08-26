const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const fs = require("node:fs");

const DEV = !app.isPackaged;
const HOST = "127.0.0.1";
const PORT = 3100;

// 用户配置(Electron userData 下的 JSON):记住备份文件夹选择
function configPath() {
  return path.join(app.getPath("userData"), "settings.json");
}
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}
function writeConfig(patch) {
  const cfg = { ...readConfig(), ...patch };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
  return cfg;
}

// asar 包内的路径无法被 spawn 执行,打包后必须用 asar.unpacked 的真实文件
function unpackedPath(...segments) {
  const resources = process.resourcesPath || path.join(process.cwd(), "Resources");
  return path.join(resources, "app.asar.unpacked", ...segments);
}

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
  // next CLI 在 asar 内也能被 ELECTRON_RUN_AS_NODE 模式执行(Electron 的 fs 补丁
  // 对自身进程生效)。优先用 asar 内完整版,避免 unpacked 残缺副本。
  const appPath = app.getAppPath();
  const nextBin = path.join(appPath, "node_modules", "next", "dist", "bin", "next");

  const base = [
    nextBin,
    DEV ? "dev" : "start",
    "-p", String(PORT),
    "-H", HOST,
    // 生产模式显式指定应用目录(asar 内),Electron fs 补丁可读
    ...(DEV ? [] : [appPath]),
  ];
  // dev:系统 node(开发环境必有);prod:Electron 内嵌 node,用户机器无需装 node
  const exec = DEV ? "node" : process.execPath;
  const env = DEV ? process.env : { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
  // 关键:cwd 不能在 asar 内(spawn 的 chdir 系统调用无法进入虚拟路径),
  // 打包时用真实文件目录;数据目录也在真实磁盘上
  const realCwd = DEV
    ? appPath
    : path.join(
        process.resourcesPath || path.dirname(appPath),
        "app.asar.unpacked",
      );
  fs.mkdirSync(realCwd, { recursive: true });
  const child = spawn(exec, base, {
    env: { ...env, NS_BACKUP_DIR: readConfig().backupDir || "" },
    cwd: realCwd,
    stdio: "inherit",
  });
  child.on("exit", (code) => console.log("[next] exited with", code));
  child.on("error", (err) => console.error("[next] spawn error:", err.message));
  return child;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Number Sober 明算",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  await win.loadURL(`http://${HOST}:${PORT}`);
  return win;
}

// ---------- IPC:备份文件夹选择 ----------
ipcMain.handle("choose-backup-dir", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    title: "选择备份保存的文件夹",
    message: "备份文件(.db)将保存到这个文件夹",
    properties: ["openDirectory", "createDirectory"],
    defaultPath: readConfig().backupDir || app.getPath("documents"),
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const dir = result.filePaths[0];
  writeConfig({ backupDir: dir });
  return { canceled: false, dir };
});

ipcMain.handle("get-backup-dir", () => ({
  dir: readConfig().backupDir || "",
}));

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
