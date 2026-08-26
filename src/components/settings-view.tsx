"use client";

import { useEffect, useState } from "react";

interface BackupFile {
  name: string;
  size: number;
}

declare global {
  interface Window {
    numberSober?: {
      chooseBackupDir: () => Promise<{ canceled: boolean; dir?: string }>;
      getBackupDir: () => Promise<{ dir: string }>;
    };
  }
}

export function SettingsView() {
  const [rate, setRate] = useState("1");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [backupDir, setBackupDir] = useState("");

  async function load() {
    const [cRes, bRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/backup"),
    ]);
    if (cRes.ok) {
      const d = await cRes.json();
      setRate(String(d.pointYenRate));
    }
    if (bRes.ok) {
      const d = await bRes.json();
      setBackups(d.backups ?? []);
    }
    // 从 Electron 主进程读取用户选择的备份文件夹
    if (window.numberSober) {
      const { dir } = await window.numberSober.getBackupDir();
      setBackupDir(dir);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function post(body: Record<string, unknown>): Promise<boolean> {
    return fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (res) => {
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMessage(d.error ?? "操作失败");
        return false;
      }
      return true;
    });
  }

  async function handleSaveRate() {
    setMessage("");
    const ok = await post({ pointYenRate: Number(rate) });
    if (ok) setMessage("已保存");
  }

  async function handleChangePassword() {
    setMessage("");
    const ok = await post({ oldPassword, newPassword });
    if (ok) {
      setMessage("密码已修改");
      setOldPassword("");
      setNewPassword("");
    }
  }

  async function handleChooseDir() {
    setMessage("");
    if (!window.numberSober) {
      setMessage("仅在桌面应用中可选择文件夹(浏览器模式使用默认位置)");
      return;
    }
    const result = await window.numberSober.chooseBackupDir();
    if (!result.canceled && result.dir) {
      setBackupDir(result.dir);
      setMessage("备份文件夹已更新,立即生效");
    }
  }

  async function handleBackupNow() {
    setMessage("");
    const res = await fetch("/api/backup", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "备份失败");
      return;
    }
    setMessage(backupDir ? `已备份到 ${backupDir}` : "备份完成");
    await load();
  }

  return (
    <section>
      <h1>设置</h1>
      {loading ? (
        <p style={{ color: "var(--muted-foreground)" }}>加载中…</p>
      ) : (
        <>
          {/* ---- 积分汇率 ---- */}
          <div className="settings-card">
            <h2>积分汇率</h2>
            <p className="settings-hint">
              当前:1 积分 = {Number(rate).toLocaleString()} 日元
            </p>
            <div className="settings-row">
              <input
                type="number"
                min={0}
                step="0.5"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="积分汇率(日元)"
                aria-label="积分汇率(日元)"
              />
              <button type="button" onClick={handleSaveRate}>
                保存汇率
              </button>
            </div>
          </div>

          {/* ---- 修改密码 ---- */}
          <div className="settings-card">
            <h2>修改密码</h2>
            <div className="settings-row">
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="旧密码"
                aria-label="旧密码"
                autoComplete="current-password"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新密码"
                aria-label="新密码"
                autoComplete="new-password"
              />
              <button type="button" onClick={handleChangePassword}>
                修改密码
              </button>
            </div>
          </div>

          {/* ---- 备份与还原 ---- */}
          <div className="settings-card">
            <h2>备份</h2>
            <p className="settings-hint">
              备份保存位置:
              <strong>{backupDir || "默认(应用数据目录/backups)"}</strong>
            </p>
            <div className="settings-row">
              <button type="button" onClick={handleChooseDir}>
                选择备份文件夹…
              </button>
              <button type="submit" onClick={handleBackupNow}>
                立即备份
              </button>
            </div>
            {backups.length > 0 ? (
              <ul>
                {backups.map((b) => (
                  <li key={b.name}>{`${b.name}(${(b.size / 1024).toFixed(0)} KB)`}</li>
                ))}
              </ul>
            ) : (
              <p className="settings-hint">还没有备份文件</p>
            )}
          </div>

          {message && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
