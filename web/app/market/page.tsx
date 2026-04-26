"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";

type Listing = {
  plugin_id: string;
  name: string;
  version: string;
  category: string;
  tagline: string;
  price_hint: string;
  capabilities: string[];
};

export default function MarketPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    const offset = (page - 1) * pageSize;
    const qs = new URLSearchParams();
    qs.set("offset", String(offset));
    qs.set("limit", String(pageSize));
    if (keyword.trim()) {
      qs.set("q", keyword.trim());
    }
    if (category) {
      qs.set("category", category);
    }
    const [res, catRes] = await Promise.all([
      apiGet(`/api/v1/marketplace/plugins?${qs.toString()}`),
      apiGet("/api/v1/marketplace/categories"),
    ]);
    setLoading(false);
    if (res.ok && Array.isArray(res.data)) {
      setItems(res.data as Listing[]);
    } else {
      setItems([]);
      setBanner(typeof res.message === "string" ? res.message : "加载失败");
    }
    if (catRes.ok && Array.isArray(catRes.data)) {
      setCategories(catRes.data.filter((x): x is string => typeof x === "string"));
    }
  }, [category, keyword, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const install = async (p: Listing) => {
    setInstalling(p.plugin_id);
    setBanner(null);
    const res = await apiPost("/api/v1/plugins/install", {
      plugin_id: p.plugin_id,
      version: p.version,
    });
    setInstalling(null);
    if (res.ok) {
      setBanner(`已安装：${p.name}。可到插件控制台配置与运行。`);
    } else {
      setBanner(typeof res.message === "string" ? res.message : "安装失败");
    }
  };

  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 880 }}>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.25rem", marginTop: 0 }}>插件市场</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        浏览 MVP 上架插件；安装后与 <strong>插件控制台</strong>、<strong>对话推荐</strong>使用同一套 <code>plugin_id</code>。
      </p>
      <p style={{ marginBottom: "var(--space-md)" }}>
        <Link
          href="/dashboard/plugins"
          style={{ color: "var(--color-accent)", fontSize: 14 }}
        >
          前往插件控制台
        </Link>
      </p>
      <div
        style={{
          display: "flex",
          gap: "var(--space-sm)",
          flexWrap: "wrap",
          marginBottom: "var(--space-md)",
          alignItems: "center",
        }}
      >
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          placeholder="搜索插件名/能力（如 翻译）"
          style={{
            minWidth: 220,
            padding: "8px 10px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-code-bg)",
            color: "var(--color-text-primary)",
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "8px 10px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-code-bg)",
            color: "var(--color-text-primary)",
          }}
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setKeyword("");
            setCategory("");
            setPage(1);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "transparent",
            color: "var(--color-accent)",
            cursor: "pointer",
          }}
        >
          清空筛选
        </button>
      </div>

      {banner ? (
        <div
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            fontSize: 14,
          }}
        >
          {banner}
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>加载目录中…</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>暂无匹配插件，换个关键词或分类试试。</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((p) => (
            <li
              key={p.plugin_id}
              style={{
                marginBottom: "var(--space-lg)",
                padding: "var(--space-lg)",
                borderRadius: "var(--radius-card)",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--color-code-bg)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 240px" }}>
                  <div style={{ fontSize: 12, color: "var(--color-accent)", marginBottom: 4 }}>{p.category}</div>
                  <h2 style={{ margin: "0 0 8px", color: "var(--color-text-primary)", fontSize: "1.05rem" }}>
                    {p.name}
                  </h2>
                  <code style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{p.plugin_id}</code>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{p.tagline}</p>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--color-text-muted)", fontSize: 13 }}>
                    {p.capabilities.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 13, color: "var(--color-warning)", marginTop: 12 }}>{p.price_hint}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>版本 {p.version}</span>
                  <Link
                    href={`/market/${encodeURIComponent(p.plugin_id)}`}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "var(--radius-control)",
                      border: "1px solid var(--color-border-subtle)",
                      color: "var(--color-accent)",
                      fontSize: 14,
                      textDecoration: "none",
                      textAlign: "center",
                    }}
                  >
                    查看详情
                  </Link>
                  <button
                    type="button"
                    disabled={installing !== null}
                    onClick={() => void install(p)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "var(--radius-control)",
                      border: "1px solid var(--color-border-strong)",
                      background: "linear-gradient(180deg, rgba(14,116,144,0.45), rgba(30,64,175,0.3))",
                      color: "var(--color-text-primary)",
                      cursor: installing ? "wait" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {installing === p.plugin_id ? "安装中…" : "安装到租户"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "transparent",
            color: "var(--color-accent)",
            cursor: page <= 1 || loading ? "not-allowed" : "pointer",
          }}
        >
          上一页
        </button>
        <button
          type="button"
          disabled={loading || items.length < pageSize}
          onClick={() => setPage((p) => p + 1)}
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "transparent",
            color: "var(--color-accent)",
            cursor: loading || items.length < pageSize ? "not-allowed" : "pointer",
          }}
        >
          下一页
        </button>
        <span style={{ color: "var(--color-text-muted)", fontSize: 13, alignSelf: "center" }}>第 {page} 页</span>
      </div>
    </main>
  );
}
