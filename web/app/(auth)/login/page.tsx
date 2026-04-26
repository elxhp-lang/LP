"use client";

import { FormEvent, useState } from "react";

import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("请输入账号密码登录");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await apiPost("/api/v1/auth/login", { email, password });
    setMessage(result.ok ? "登录成功（骨架）" : `登录失败：${result.message}`);
  };

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>登录</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">登录</button>
      </form>
      <p>{message}</p>
    </main>
  );
}
