"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSetup() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.trim().length < 4) {
      setError("密码至少 4 位");
      return;
    }
    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "设置失败");
      return;
    }
    router.refresh();
  }

  return (
    <section>
      <h1>欢迎使用 Number Sober 明算</h1>
      <p>首次运行,请设置管理员密码</p>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="设置密码(至少 4 位)"
          aria-label="管理员密码"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="再次输入密码"
          aria-label="确认密码"
        />
        <button type="submit">完成设置</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
