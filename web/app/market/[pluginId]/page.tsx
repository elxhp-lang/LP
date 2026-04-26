"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const pluginId = typeof params?.pluginId === "string" ? params.pluginId : "";
  const [detail, setDetail] = useState<PluginDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [wallet, setWallet] = useState<number | null>(null);
  const [payChannel, setPayChannel] = useState<"ALIPAY" | "WECHAT_PAY" | "WALLET">("ALIPAY");
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
      const [res, walletRes] = await Promise.all([
        apiGet(`/api/v1/marketplace/plugins/${encodeURIComponent(pluginId)}`),
        apiGet("/api/v1/billing/wallet"),
      ]);
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
      if (walletRes.ok && walletRes.data && typeof walletRes.data === "object") {
        const b = (walletRes.data as { balance?: unknown }).balance;
        setWallet(typeof b === "number" ? b : null);
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

  const checkout = async () => {
    if (!detail) {
      return;
    }
    setPurchasing(true);
    setBanner(null);
    const res = await apiPost("/api/v1/billing/checkout", {
      plugin_id: detail.plugin_id,
      amount: 99,
      currency: "CNY",
      pay_channel: payChannel,
    });
    setPurchasing(false);
    if (!res.ok || !res.data || typeof res.data !== "object") {
      setBanner(typeof res.message === "string" ? res.message : "下单失败");
      return;
    }
    const data = res.data as {
      order_id?: unknown;
      status?: unknown;
      next_action?: unknown;
      pay_url?: unknown;
    };
    const orderId = typeof data.order_id === "string" ? data.order_id : "";
    const status = typeof data.status === "string" ? data.status : "unknown";
    const nextAction = typeof data.next_action === "string" ? data.next_action : "";
    const payUrl = typeof data.pay_url === "string" ? data.pay_url : "";
    if (status === "pending" && payUrl) {
      setBanner(`订单已创建，请在${payChannel === "ALIPAY" ? "支付宝" : "微信"}完成支付（占位链接）：${payUrl}`);
      if (orderId) {
        router.push(`/billing/orders/${encodeURIComponent(orderId)}`);
      }
    } else if (status === "paid") {
      setBanner("已支付完成，可继续安装与配置插件。");
      const w = await apiGet("/api/v1/billing/wallet");
      if (w.ok && w.data && typeof w.data === "object") {
        const b = (w.data as { balance?: unknown }).balance;
        setWallet(typeof b === "number" ? b : wallet);
      }
    } else {
      setBanner(`下单结果：${status}${nextAction ? `（${nextAction}）` : ""}`);
      if (orderId) {
        router.push(`/billing/orders/${encodeURIComponent(orderId)}`);
      }
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
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 8 }}>
            余额（MVP）：{wallet === null ? "加载中…" : `${wallet} CNY`}
          </p>
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={payChannel}
              onChange={(e) => setPayChannel(e.target.value as "ALIPAY" | "WECHAT_PAY" | "WALLET")}
              style={{
                padding: "10px 12px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--color-code-bg)",
                color: "var(--color-text-primary)",
                marginTop: "var(--space-sm)",
              }}
            >
              <option value="ALIPAY">支付宝</option>
              <option value="WECHAT_PAY">微信支付</option>
              <option value="WALLET">钱包余额</option>
            </select>
            <button
              type="button"
              disabled={purchasing}
              onClick={() => void checkout()}
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "transparent",
                color: "var(--color-accent)",
                cursor: purchasing ? "wait" : "pointer",
                marginTop: "var(--space-sm)",
              }}
            >
              {purchasing ? "下单中…" : "下单支付（占位）"}
            </button>
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
          </div>
        </article>
      )}
    </main>
  );
}

