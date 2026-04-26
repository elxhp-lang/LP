"use client";

import { useState } from "react";

import { apiPost } from "@/lib/api";

type RecommendPayload = {
  intent_summary: string;
  plugins: Array<{
    plugin_id: string;
    name: string;
    role: string;
    price_hint: string;
    capabilities: string[];
    case_example: string;
  }>;
  workflow_draft: { steps: Array<{ plugin_id: string; title: string }> };
  billing_hints: string[];
  next_actions: string[];
};

type PreflightPayload = {
  allowed: boolean;
  needs_purchase: boolean;
  needs_topup: boolean;
  detail: string;
};

export default function ChatPage() {
  const [message, setMessage] = useState("我是跨境卖家，需要翻译商品详情并看欧洲市场趋势");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendPayload | null>(null);
  const [preflight, setPreflight] = useState<PreflightPayload | null>(null);
  const [savingWf, setSavingWf] = useState(false);

  const onRecommend = async () => {
    setLoading(true);
    setResult(null);
    const res = await apiPost("/api/v1/agent/recommend", { message });
    setLoading(false);
    if (res.ok && res.data && typeof res.data === "object" && "intent_summary" in res.data) {
      setResult(res.data as RecommendPayload);
    } else {
      setResult(null);
      window.alert(typeof res.message === "string" ? res.message : "推荐失败");
    }
  };

  const onPreflight = async () => {
    const ids = result?.plugins.map((p) => p.plugin_id) ?? [];
    const res = await apiPost("/api/v1/agent/preflight", { plugin_ids: ids });
    if (
      res.ok &&
      res.data &&
      typeof res.data === "object" &&
      "allowed" in res.data &&
      "needs_purchase" in res.data &&
      "needs_topup" in res.data &&
      "detail" in res.data
    ) {
      setPreflight(res.data as PreflightPayload);
    } else {
      setPreflight({
        allowed: false,
        needs_purchase: false,
        needs_topup: false,
        detail: typeof res.message === "string" ? res.message : "预检失败",
      });
    }
  };

  const onSaveWorkflow = async () => {
    if (!result) {
      return;
    }
    const defaultName = `推荐 ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const name =
      typeof window !== "undefined" ? window.prompt("工作流名称", defaultName) ?? "" : defaultName;
    if (!name.trim()) {
      return;
    }
    setSavingWf(true);
    const res = await apiPost("/api/v1/workflows", {
      name: name.trim(),
      description: result.intent_summary,
      steps: result.workflow_draft.steps,
    });
    setSavingWf(false);
    if (res.ok) {
      window.alert("已保存。可到「工作流」页查看。");
    } else {
      window.alert(typeof res.message === "string" ? res.message : "保存失败");
    }
  };

  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 880 }}>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.25rem", marginTop: 0 }}>对话模式</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        描述职业或需求，系统用<strong>规则引擎</strong>生成插件组合与工作流草案（契约与后续大模型一致）。
      </p>

      <label style={{ display: "block", color: "var(--color-text-secondary)", fontSize: 14, marginBottom: 8 }}>
        你的想法
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: "var(--space-md)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-code-bg)",
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </label>

      <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", marginBottom: "var(--space-lg)" }}>
        <button
          type="button"
          disabled={loading || !message.trim()}
          onClick={() => void onRecommend()}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-strong)",
            background: "linear-gradient(180deg, rgba(14,116,144,0.45), rgba(30,64,175,0.3))",
            color: "var(--color-text-primary)",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "分析中…" : "生成推荐方案"}
        </button>
        <button
          type="button"
          disabled={!result}
          onClick={() => void onPreflight()}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "transparent",
            color: "var(--color-accent)",
            cursor: result ? "pointer" : "not-allowed",
          }}
        >
          运行前检查（占位）
        </button>
        <button
          type="button"
          disabled={!result || savingWf}
          onClick={() => void onSaveWorkflow()}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "transparent",
            color: "var(--color-text-primary)",
            cursor: result && !savingWf ? "pointer" : "not-allowed",
          }}
        >
          {savingWf ? "保存中…" : "保存为工作流"}
        </button>
      </div>

      {result ? (
        <div
          style={{
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "var(--space-lg)",
            background: "var(--color-bg-surface)",
            marginBottom: "var(--space-lg)",
          }}
        >
          <h2 style={{ marginTop: 0, color: "var(--color-accent)", fontSize: "1rem" }}>意图摘要</h2>
          <p style={{ color: "var(--color-text-secondary)" }}>{result.intent_summary}</p>

          <h3 style={{ color: "var(--color-text-primary)", fontSize: "0.95rem" }}>推荐插件</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-text-secondary)" }}>
            {result.plugins.map((p) => (
              <li key={p.plugin_id} style={{ marginBottom: 12 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>{p.name}</strong>{" "}
                <code style={{ fontSize: 12 }}>{p.plugin_id}</code>
                <div>{p.role}</div>
                <div style={{ fontSize: 13 }}>费用提示：{p.price_hint}</div>
                <div style={{ fontSize: 13 }}>案例：{p.case_example}</div>
              </li>
            ))}
          </ul>

          <h3 style={{ color: "var(--color-text-primary)", fontSize: "0.95rem" }}>工作流草案</h3>
          <ol style={{ color: "var(--color-text-secondary)" }}>
            {result.workflow_draft.steps.map((s) => (
              <li key={s.plugin_id}>{s.title}</li>
            ))}
          </ol>

          <h3 style={{ color: "var(--color-text-primary)", fontSize: "0.95rem" }}>计费与购买提醒</h3>
          <ul style={{ color: "var(--color-warning)" }}>
            {result.billing_hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <h3 style={{ color: "var(--color-text-primary)", fontSize: "0.95rem" }}>建议下一步</h3>
          <ul style={{ color: "var(--color-text-secondary)" }}>
            {result.next_actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight ? (
        <section
          style={{
            padding: "var(--space-md)",
            borderRadius: "var(--radius-control)",
            background: "var(--color-code-bg)",
            border: "1px solid var(--color-border-subtle)",
            color: "var(--color-text-secondary)",
            fontSize: 13,
            overflow: "hidden",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            预检结果：
            <strong style={{ color: preflight.allowed ? "var(--color-success)" : "var(--color-warning)" }}>
              {preflight.allowed ? "可执行" : "暂不可执行"}
            </strong>
          </div>
          <div style={{ marginBottom: 8 }}>{preflight.detail}</div>
          <div style={{ color: "var(--color-text-muted)" }}>
            需购买：{preflight.needs_purchase ? "是" : "否"} ｜需充值：{preflight.needs_topup ? "是" : "否"}
          </div>
        </section>
      ) : null}
    </main>
  );
}
