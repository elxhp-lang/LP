"use client";

import { FormEvent, useState } from "react";

import { apiPost } from "@/lib/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("创建新账号");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await apiPost("/api/v1/auth/register", { email, display_name: displayName, password });
    setMessage(result.ok ? "注册成功（骨架）" : `注册失败：${result.message}`);
  };

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>注册</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <input placeholder="昵称" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">注册</button>
      </form>
      <p>{message}</p>
    </main>
  );
}
