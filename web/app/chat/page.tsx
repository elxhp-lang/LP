"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";

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

type FlowRunLog = {
  stepTitle: string;
  pluginId: string;
  ok: boolean;
  message: string;
};

type FlowRunSummary = {
  ranAt: string;
  totalSteps: number;
  successSteps: number;
  failedSteps: number;
  firstFailedStepTitle: string | null;
};

type AIUsageSummary = {
  period: string;
  quota_units: number;
  used_units: number;
  remaining_units: number;
  calls: number;
  success_calls: number;
  failed_calls: number;
};

type AIAuditItem = {
  id: string;
  plugin_id: string;
  task_type: string;
  provider: string;
  model: string;
  status: string;
  status_code: string;
  error_message: string;
  output_preview: string;
  created_at: string;
};

export default function ChatPage() {
  const [message, setMessage] = useState("我是跨境卖家，需要翻译商品详情并看欧洲市场趋势");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendPayload | null>(null);
  const [preflight, setPreflight] = useState<PreflightPayload | null>(null);
  const [savingWf, setSavingWf] = useState(false);
  const [runningFlow, setRunningFlow] = useState(false);
  const [flowLogs, setFlowLogs] = useState<FlowRunLog[]>([]);
  const [flowReadyHint, setFlowReadyHint] = useState<string | null>(null);
  const [lastRunSummary, setLastRunSummary] = useState<FlowRunSummary | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsageSummary | null>(null);
  const [aiAuditItems, setAiAuditItems] = useState<AIAuditItem[]>([]);

  const refreshAiUsage = async () => {
    const res = await apiGet("/api/v1/ai/usage/summary");
    if (res.ok && res.data && typeof res.data === "object" && "quota_units" in res.data) {
      setAiUsage(res.data as AIUsageSummary);
    }
  };

  const refreshAiAudit = async () => {
    const res = await apiGet("/api/v1/ai/audit/logs?offset=0&limit=5");
    if (res.ok && res.data && typeof res.data === "object" && "items" in res.data) {
      const items = (res.data as { items: AIAuditItem[] }).items;
      setAiAuditItems(Array.isArray(items) ? items : []);
    }
  };

  const runPreflightByIds = async (ids: string[]) => {
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

  const onRecommend = async () => {
    setLoading(true);
    setResult(null);
    const res = await apiPost("/api/v1/agent/recommend", { message });
    setLoading(false);
    if (res.ok && res.data && typeof res.data === "object" && "intent_summary" in res.data) {
      const payload = res.data as RecommendPayload;
      setResult(payload);
      if (typeof window !== "undefined") {
        const ids = payload.plugins.map((p) => p.plugin_id);
        window.localStorage.setItem("lp_last_recommend_plugin_ids", JSON.stringify(ids));
      }
    } else {
      setResult(null);
      window.alert(typeof res.message === "string" ? res.message : "推荐失败");
    }
  };

  const onPreflight = async () => {
    const ids = result?.plugins.map((p) => p.plugin_id) ?? [];
    await runPreflightByIds(ids);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("flow_ready") === "1") {
      setFlowReadyHint("支付与安装已完成，推荐流程可直接执行。");
    }
    if (qs.get("autopreflight") !== "1") {
      return;
    }
    const raw = window.localStorage.getItem("lp_last_recommend_plugin_ids");
    if (!raw) {
      return;
    }
    try {
      const ids = JSON.parse(raw) as unknown;
      if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) {
        void runPreflightByIds(ids as string[]);
      }
    } catch {
      // ignore malformed local storage
    }

    const summaryRaw = window.localStorage.getItem("lp_last_flow_run_summary");
    if (summaryRaw) {
      try {
        const parsed = JSON.parse(summaryRaw) as FlowRunSummary;
        if (parsed && typeof parsed.totalSteps === "number" && typeof parsed.successSteps === "number") {
          setLastRunSummary(parsed);
        }
      } catch {
        // ignore malformed local storage
      }
    }
    void refreshAiUsage();
    void refreshAiAudit();
  }, []);

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

  const onRunRecommendedFlow = async () => {
    if (!result || !preflight?.allowed) {
      return;
    }
    setRunningFlow(true);
    setFlowLogs([]);
    const logs: FlowRunLog[] = [];
    for (const step of result.workflow_draft.steps) {
      const res = await apiPost("/api/v1/plugins/use", {
        plugin_id: step.plugin_id,
        action: step.title,
        api_name: "ai:invoke",
      });
      logs.push({
        stepTitle: step.title,
        pluginId: step.plugin_id,
        ok: res.ok,
        message: typeof res.message === "string" ? res.message : res.ok ? "ok" : "failed",
      });
      setFlowLogs([...logs]);
      if (!res.ok) {
        break;
      }
    }
    setRunningFlow(false);
    const summary: FlowRunSummary = {
      ranAt: new Date().toISOString(),
      totalSteps: logs.length,
      successSteps: logs.filter((x) => x.ok).length,
      failedSteps: logs.filter((x) => !x.ok).length,
      firstFailedStepTitle: logs.find((x) => !x.ok)?.stepTitle ?? null,
    };
    setLastRunSummary(summary);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lp_last_flow_run_summary", JSON.stringify(summary));
    }
    void refreshAiUsage();
    void refreshAiAudit();
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
      {flowReadyHint ? (
        <div
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-surface)",
            color: "var(--color-success)",
            fontSize: 13,
          }}
        >
          {flowReadyHint}
        </div>
      ) : null}
      {lastRunSummary ? (
        <div
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-code-bg)",
            color: "var(--color-text-secondary)",
            fontSize: 13,
          }}
        >
          最近一次执行：成功 {lastRunSummary.successSteps}/{lastRunSummary.totalSteps}
          {lastRunSummary.failedSteps > 0 ? (
            <span style={{ color: "var(--color-warning)" }}>
              {" "}
              ｜失败 {lastRunSummary.failedSteps}（首个失败步骤：{lastRunSummary.firstFailedStepTitle}）
            </span>
          ) : (
            <span style={{ color: "var(--color-success)" }}> ｜全部通过，可直接复用该流程</span>
          )}
        </div>
      ) : null}
      {aiUsage ? (
        <div
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-bg-surface)",
            color: "var(--color-text-secondary)",
            fontSize: 13,
          }}
        >
          AI 用量（{aiUsage.period}）：已用 {aiUsage.used_units}/{aiUsage.quota_units}，剩余{" "}
          {aiUsage.remaining_units} ｜调用 {aiUsage.calls} 次（成功 {aiUsage.success_calls} / 失败{" "}
          {aiUsage.failed_calls}）
        </div>
      ) : null}
      {aiAuditItems.length > 0 ? (
        <div
          style={{
            marginBottom: "var(--space-md)",
            padding: "var(--space-sm) var(--space-md)",
            borderRadius: "var(--radius-control)",
            border: "1px solid var(--color-border-subtle)",
            background: "var(--color-code-bg)",
            color: "var(--color-text-secondary)",
            fontSize: 13,
          }}
        >
          <div style={{ marginBottom: 6, color: "var(--color-text-primary)" }}>最近 AI 审计记录</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {aiAuditItems.map((item) => (
              <li key={item.id} style={{ marginBottom: 4 }}>
                [{item.status === "success" ? "OK" : "ERR"}] {item.plugin_id} / {item.task_type}
                {item.model ? ` / ${item.model}` : ""}
                {item.status_code ? ` / ${item.status_code}` : ""}
                {item.error_message ? ` / ${item.error_message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
          {preflight.allowed && result ? (
            <div style={{ marginTop: 10, display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={runningFlow}
                onClick={() => void onRunRecommendedFlow()}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--color-border-subtle)",
                  background: "transparent",
                  color: "var(--color-success)",
                  cursor: runningFlow ? "wait" : "pointer",
                }}
              >
                {runningFlow ? "执行中…" : "立即运行推荐流程"}
              </button>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", alignSelf: "center" }}>
                支付回跳后可直接点这里，不用再手动找入口。
              </span>
            </div>
          ) : null}
          {preflight.needs_purchase && result?.plugins?.[0] ? (
            <p style={{ marginTop: 10 }}>
              <Link
                href={`/market/${encodeURIComponent(result.plugins[0].plugin_id)}?return_to=${encodeURIComponent("/chat?autopreflight=1")}`}
                style={{ color: "var(--color-accent)", fontSize: 13 }}
              >
                去购买首个推荐插件：{result.plugins[0].name}
              </Link>
            </p>
          ) : null}
          {flowLogs.length > 0 ? (
            <ul style={{ marginTop: 12, marginBottom: 0, paddingLeft: 18, color: "var(--color-text-secondary)" }}>
              {flowLogs.map((log, idx) => (
                <li key={`${log.pluginId}-${idx}`}>
                  {log.ok ? "✅" : "❌"} {log.stepTitle}（{log.pluginId}）: {log.message}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
