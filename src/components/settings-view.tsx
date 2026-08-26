"use client";

import { useEffect, useState } from "react";

export function SettingsView() {
  const [rate, setRate] = useState("1");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<{ name: string; size: number }[]>([]);

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

  async function handleBackupNow() {
    setMessage("");
    const res = await fetch("/api/backup", { method: "POST" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMessage(d.error ?? "备份失败");
      return;
    }
    setMessage("备份完成");
    await load();
  }

  return (
    <section>
      <h1>系统设置</h1>
      {loading ? (
        <p>加载中…</p>
      ) : (
        <>
          <div>
            <h2>积分汇率</h2>
            <p>{`当前:1 积分 = ${rate} 日元`}</p>
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
          <div>
            <h2>修改密码</h2>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="旧密码"
              aria-label="旧密码"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码"
              aria-label="新密码"
            />
            <button type="button" onClick={handleChangePassword}>
              修改密码
            </button>
          </div>
          <div>
            <h2>备份与还原</h2>
            <button type="button" onClick={handleBackupNow}>
              立即备份
            </button>
            {backups.length > 0 && (
              <ul>
                {backups.map((b) => (
                  <li key={b.name}>
                    {`${b.name}(${(b.size / 1024).toFixed(0)} KB)`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {message && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
