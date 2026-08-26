"use client";

import { useEffect, useState } from "react";

export function SettingsView() {
  const [rate, setRate] = useState("1");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/config");
    if (res.ok) {
      const d = await res.json();
      setRate(String(d.pointYenRate));
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
          {message && <p role="status">{message}</p>}
        </>
      )}
    </section>
  );
}
