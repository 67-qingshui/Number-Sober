"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("密码错误,请重试");
      return;
    }
    router.push("/");
  }

  return (
    <section>
      <h1>登录 Number Sober 明算</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入管理员密码"
          aria-label="密码"
        />
        <button type="submit">登录</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
