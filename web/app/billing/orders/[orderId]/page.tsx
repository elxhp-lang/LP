"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";

type OrderDetail = {
  id: string;
  plugin_id: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | string;
  created_at?: string;
};

export default function BillingOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = search.get("return_to") || "";

  const isTerminal = useMemo(() => order?.status === "paid" || order?.status === "failed", [order?.status]);

  const load = async () => {
    if (!orderId) {
      setError("缺少订单号");
      setLoading(false);
      return;
    }
    const res = await apiGet(`/api/v1/billing/purchases/${encodeURIComponent(orderId)}`);
    setLoading(false);
    if (res.ok && res.data && typeof res.data === "object") {
      setOrder(res.data as OrderDetail);
      setError(null);
    } else {
      setError(typeof res.message === "string" ? res.message : "查询订单失败");
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (isTerminal || !orderId) {
      return;
    }
    const timer = window.setInterval(() => {
      void load();
    }, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminal, orderId]);

  const confirm = async (paid: boolean) => {
    if (!order) {
      return;
    }
    setPendingAction(true);
    const res = await apiPost("/api/v1/billing/checkout/confirm", {
      order_id: order.id,
      paid,
      provider_trade_no: paid ? `mock_${Date.now()}` : null,
    });
    setPendingAction(false);
    if (res.ok) {
      await load();
    } else {
      setError(typeof res.message === "string" ? res.message : "更新支付状态失败");
    }
  };

  const installPlugin = async () => {
    if (!order || order.status !== "paid") {
      return;
    }
    setInstalling(true);
    const res = await apiPost("/api/v1/plugins/install", {
      plugin_id: order.plugin_id,
      version: "0.1.0",
    });
    setInstalling(false);
    if (res.ok) {
      setInstalled(true);
      setError(null);
    } else {
      setError(typeof res.message === "string" ? res.message : "安装失败");
    }
  };

  useEffect(() => {
    if (!order || order.status !== "paid" || installed || installing) {
      return;
    }
    void installPlugin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.plugin_id]);

  useEffect(() => {
    if (!installed || !returnTo) {
      return;
    }
    const timer = window.setTimeout(() => {
      const sep = returnTo.includes("?") ? "&" : "?";
      router.push(`${returnTo}${sep}flow_ready=1`);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [installed, returnTo, router]);

  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 760 }}>
      <p style={{ marginBottom: "var(--space-md)" }}>
        <Link href="/market" style={{ color: "var(--color-accent)", fontSize: 14 }}>
          返回插件市场
        </Link>
      </p>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.2rem", marginTop: 0 }}>订单状态</h1>
      <p style={{ color: "var(--color-text-secondary)" }}>
        支付渠道联调占位页。待支付订单会每 3 秒自动刷新状态。
      </p>
      {installed && returnTo ? (
        <p style={{ color: "var(--color-success)", fontSize: 13 }}>
          已安装成功，正在返回上一流程…
        </p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--color-danger)", marginBottom: "var(--space-md)" }}>{error}</p>
      ) : null}

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>加载订单中…</p>
      ) : order ? (
        <section
          style={{
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-card)",
            background: "var(--color-code-bg)",
            padding: "var(--space-lg)",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>订单号：</strong>
            <code>{order.id}</code>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>插件：</strong>
            <code>{order.plugin_id}</code>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>金额：</strong>
            {order.amount} {order.currency}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>状态：</strong>
            <span
              style={{
                color:
                  order.status === "paid"
                    ? "var(--color-success)"
                    : order.status === "failed"
                      ? "var(--color-danger)"
                      : "var(--color-warning)",
              }}
            >
              {order.status}
            </span>
          </div>
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginTop: "var(--space-md)" }}>
            <button
              type="button"
              onClick={() => void confirm(true)}
              disabled={pendingAction || isTerminal}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "transparent",
                color: "var(--color-success)",
                cursor: pendingAction || isTerminal ? "not-allowed" : "pointer",
              }}
            >
              模拟支付成功
            </button>
            <button
              type="button"
              onClick={() => void confirm(false)}
              disabled={pendingAction || isTerminal}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "transparent",
                color: "var(--color-danger)",
                cursor: pendingAction || isTerminal ? "not-allowed" : "pointer",
              }}
            >
              模拟支付失败
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/plugins")}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "transparent",
                color: "var(--color-accent)",
                cursor: "pointer",
              }}
            >
              去插件控制台
            </button>
            {order.status === "paid" ? (
              <button
                type="button"
                onClick={() => void installPlugin()}
                disabled={installing || installed}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--color-border-subtle)",
                  background: "transparent",
                  color: installed ? "var(--color-success)" : "var(--color-accent)",
                  cursor: installing || installed ? "not-allowed" : "pointer",
                }}
              >
                {installed ? "已自动安装" : installing ? "安装中…" : "立即安装插件"}
              </button>
            ) : null}
            {returnTo ? (
              <button
                type="button"
                onClick={() => router.push(returnTo)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--color-border-subtle)",
                  background: "transparent",
                  color: "var(--color-accent)",
                  cursor: "pointer",
                }}
              >
                返回上一流程
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

