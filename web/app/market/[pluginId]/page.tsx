"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";

type PluginDetail = {
  plugin_id: string;
  name: string;
  version: string;
  category: string;
  tagline: string;
  price_hint: string;
  capabilities: string[];
  description: string;
  case_example: string;
};

export default function MarketPluginDetailPage() {
  const params = useParams<{ pluginId: string }>();
  const pluginId = typeof params?.pluginId === "string" ? params.pluginId : "";
  const [detail, setDetail] = useState<PluginDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      if (!pluginId) {
        setLoading(false);
        setBanner("缺少插件 ID");
        setDetail(null);
        return;
      }
      const res = await apiGet(`/api/v1/marketplace/plugins/${encodeURIComponent(pluginId)}`);
      if (!active) {
        return;
      }
      setLoading(false);
      if (res.ok && res.data && typeof res.data === "object") {
        setDetail(res.data as PluginDetail);
      } else {
        setDetail(null);
        setBanner(typeof res.message === "string" ? res.message : "加载详情失败");
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [pluginId]);

  const install = async () => {
    if (!detail) {
      return;
    }
    setInstalling(true);
    setBanner(null);
    const res = await apiPost("/api/v1/plugins/install", {
      plugin_id: detail.plugin_id,
      version: detail.version,
    });
    setInstalling(false);
    if (res.ok) {
      setBanner(`已安装：${detail.name}。可到插件控制台配置与运行。`);
    } else {
      setBanner(typeof res.message === "string" ? res.message : "安装失败");
    }
  };

  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 860 }}>
      <p style={{ marginBottom: "var(--space-md)" }}>
        <Link href="/market" style={{ color: "var(--color-accent)", fontSize: 14 }}>
          返回插件市场
        </Link>
      </p>

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
        <p style={{ color: "var(--color-text-muted)" }}>加载详情中…</p>
      ) : !detail ? (
        <p style={{ color: "var(--color-warning)" }}>未找到该插件。</p>
      ) : (
        <article
          style={{
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "var(--space-lg)",
            background: "var(--color-code-bg)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-accent)" }}>{detail.category}</div>
          <h1 style={{ marginTop: 8, marginBottom: 8, color: "var(--color-text-primary)" }}>{detail.name}</h1>
          <code style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{detail.plugin_id}</code>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{detail.description}</p>
          <p style={{ color: "var(--color-text-secondary)", marginTop: 8 }}>
            <strong>案例：</strong>
            {detail.case_example}
          </p>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--color-text-muted)", fontSize: 14 }}>
            {detail.capabilities.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p style={{ fontSize: 13, color: "var(--color-warning)", marginTop: 12 }}>{detail.price_hint}</p>
          <button
            type="button"
            disabled={installing}
            onClick={() => void install()}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-control)",
              border: "1px solid var(--color-border-strong)",
              background: "linear-gradient(180deg, rgba(14,116,144,0.45), rgba(30,64,175,0.3))",
              color: "var(--color-text-primary)",
              cursor: installing ? "wait" : "pointer",
              marginTop: "var(--space-sm)",
            }}
          >
            {installing ? "安装中…" : "安装到租户"}
          </button>
        </article>
      )}
    </main>
  );
}

