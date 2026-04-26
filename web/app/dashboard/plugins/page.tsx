"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";

type PluginRow = {
  id: string;
  name: string;
  version: string;
  permissions: string[];
};

type ApiResult = {
  ok: boolean;
  message: string;
  data: unknown;
};

type PluginStatus = "未安装" | "已安装" | "已配置" | "运行中" | "已卸载" | "失败";

type AIBillingRecord = {
  id: string;
  plugin_id: string;
  task_type: string;
  billed_units: number;
  unit_price: number;
  billed_amount: number;
  status: string;
  reason: string;
  wallet_balance_after: number;
  created_at: string;
};

type AIRoutePolicy = {
  id: string;
  plugin_id: string;
  task_type: string;
  model_chain: string;
  disabled_models: string;
  updated_at: string;
};

type RoutePolicySubmitResult = {
  id: string;
  plugin_id: string;
  task_type: string;
  updated_at: string;
};

const demoPlugins: PluginRow[] = [
  {
    id: "plugin.translation.gpt",
    name: "商品翻译插件",
    version: "0.1.0",
    permissions: ["ai:invoke", "i18n:read", "i18n:write"],
  },
  {
    id: "plugin.market.analysis.composer",
    name: "市场分析插件",
    version: "0.1.0",
    permissions: ["ai:invoke", "market:read", "chart:render"],
  },
];

export default function PluginDashboardPage() {
  const [translationConfig, setTranslationConfig] = useState({
    sourceLanguage: "zh-CN",
    targetLanguage: "en-US",
  });
  const [marketConfig, setMarketConfig] = useState({
    market: "eu",
  });
  const [loadingAction, setLoadingAction] = useState<string>("");
  const [lastResult, setLastResult] = useState<ApiResult | null>(null);
  const [pluginStatus, setPluginStatus] = useState<Record<string, PluginStatus>>({
    "plugin.translation.gpt": "未安装",
    "plugin.market.analysis.composer": "未安装",
  });
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [aiBillingRecords, setAiBillingRecords] = useState<AIBillingRecord[]>([]);
  const [aiRoutePolicies, setAiRoutePolicies] = useState<AIRoutePolicy[]>([]);
  const [newRoutePolicy, setNewRoutePolicy] = useState({
    plugin_id: "plugin.translation.gpt",
    task_type: "translate",
    model_chain: "deepseek-chat|gpt-4o-mini",
    disabled_models: "",
  });
  const [routePolicyError, setRoutePolicyError] = useState<string>("");
  const [lastRoutePolicySubmit, setLastRoutePolicySubmit] = useState<RoutePolicySubmitResult | null>(null);
  const [routePolicyKeyword, setRoutePolicyKeyword] = useState("");
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);

  const actionHint = useMemo(() => {
    if (!loadingAction) {
      return "";
    }
    return `执行中：${loadingAction}`;
  }, [loadingAction]);

  const filteredRoutePolicies = useMemo(() => {
    const kw = routePolicyKeyword.trim().toLowerCase();
    const sorted = [...aiRoutePolicies].sort((a, b) => {
      const ta = Date.parse(a.updated_at || "");
      const tb = Date.parse(b.updated_at || "");
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
    if (!kw) {
      return sorted;
    }
    return sorted.filter((item) => {
      const hay = `${item.plugin_id} ${item.task_type} ${item.model_chain} ${item.disabled_models}`.toLowerCase();
      return hay.includes(kw);
    });
  }, [aiRoutePolicies, routePolicyKeyword]);

  const refreshAiOpsPanels = async () => {
    const [recordsRes, policiesRes] = await Promise.all([
      apiGet("/api/v1/ai/billing/records?offset=0&limit=6"),
      apiGet("/api/v1/ai/route/policies"),
    ]);
    if (recordsRes.ok && recordsRes.data && typeof recordsRes.data === "object" && "items" in recordsRes.data) {
      const items = (recordsRes.data as { items: AIBillingRecord[] }).items;
      setAiBillingRecords(Array.isArray(items) ? items : []);
    }
    if (policiesRes.ok && policiesRes.data && typeof policiesRes.data === "object" && "items" in policiesRes.data) {
      const items = (policiesRes.data as { items: AIRoutePolicy[] }).items;
      setAiRoutePolicies(Array.isArray(items) ? items : []);
      setSelectedPolicyIds((prev) =>
        prev.filter((id) => (Array.isArray(items) ? items.some((x) => x.id === id) : false)),
      );
    }
  };

  useEffect(() => {
    void refreshAiOpsPanels();
  }, []);

  const runAction = async (
    pluginId: string,
    actionLabel: string,
    path: string,
    body: Record<string, unknown>,
    nextStatus: PluginStatus,
  ) => {
    setLoadingAction(actionLabel);
    const result = await apiPost(path, body);
    setLastResult(result);
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setActivityLogs((prev) => [`[${now}] ${actionLabel} -> ${result.ok ? "成功" : "失败"}`, ...prev].slice(0, 8));
    setPluginStatus((prev) => ({
      ...prev,
      [pluginId]: result.ok ? nextStatus : "失败",
    }));
    void refreshAiOpsPanels();
    setLoadingAction("");
  };

  const installPlugin = async (plugin: PluginRow) => {
    await runAction(
      plugin.id,
      `安装 ${plugin.name}`,
      "/api/v1/plugins/install",
      {
        plugin_id: plugin.id,
        version: plugin.version,
      },
      "已安装",
    );
  };

  const configurePlugin = async (plugin: PluginRow) => {
    const config =
      plugin.id === "plugin.translation.gpt"
        ? translationConfig
        : marketConfig;
    await runAction(
      plugin.id,
      `配置 ${plugin.name}`,
      "/api/v1/plugins/configure",
      {
        plugin_id: plugin.id,
        config,
      },
      "已配置",
    );
  };

  const usePlugin = async (plugin: PluginRow) => {
    const action =
      plugin.id === "plugin.translation.gpt" ? "translate-product" : "analyze-market";
    const apiName = plugin.id === "plugin.translation.gpt" ? "ai:invoke" : "market:read";
    await runAction(
      plugin.id,
      `使用 ${plugin.name}`,
      "/api/v1/plugins/use",
      {
        plugin_id: plugin.id,
        action,
        api_name: apiName,
      },
      "运行中",
    );
  };

  /** 走核心 AI 网关（stub 或环境变量配置的远程模型），不改变插件生命周期状态。 */
  const invokeAiGateway = async (plugin: PluginRow) => {
    const taskType =
      plugin.id === "plugin.translation.gpt" ? "translate-product" : "analyze-market";
    const payload =
      plugin.id === "plugin.translation.gpt"
        ? {
            ...translationConfig,
            sampleText: "你好，世界！这是一条控制台试调文案。",
          }
        : {
            ...marketConfig,
            topic: "便携储能",
          };
    setLoadingAction(`AI 网关：${plugin.name}`);
    const result = await apiPost("/api/v1/ai/invoke", {
      plugin_id: plugin.id,
      task_type: taskType,
      payload,
    });
    setLastResult(result);
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    const ok = result.ok;
    setActivityLogs((prev) =>
      [`[${now}] AI 网关试调 (${plugin.name}) -> ${ok ? "成功" : "失败"}`, ...prev].slice(0, 8),
    );
    void refreshAiOpsPanels();
    setLoadingAction("");
  };

  const uninstallPlugin = async (plugin: PluginRow) => {
    await runAction(
      plugin.id,
      `卸载 ${plugin.name}`,
      `/api/v1/plugins/uninstall/${plugin.id}`,
      {},
      "已卸载",
    );
  };

  const createRoutePolicy = async () => {
    const chain = newRoutePolicy.model_chain.trim();
    if (!chain) {
      setRoutePolicyError("模型链路不能为空。");
      return;
    }
    if (chain.includes("||") || chain.startsWith("|") || chain.endsWith("|")) {
      setRoutePolicyError("模型链路格式不正确，示例：modelA|modelB。");
      return;
    }
    if (newRoutePolicy.disabled_models.includes("||")) {
      setRoutePolicyError("禁用模型格式不正确，可用英文逗号分隔。");
      return;
    }
    setRoutePolicyError("");
    setLoadingAction("新增 AI 路由策略");
    const result = await apiPost("/api/v1/ai/route/policies", newRoutePolicy);
    setLastResult(result);
    if (result.ok && result.data && typeof result.data === "object" && "id" in result.data) {
      setLastRoutePolicySubmit(result.data as RoutePolicySubmitResult);
    }
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setActivityLogs((prev) => [`[${now}] 新增路由策略 -> ${result.ok ? "成功" : "失败"}`, ...prev].slice(0, 8));
    void refreshAiOpsPanels();
    setLoadingAction("");
  };

  const applyRoutePolicyTemplate = () => {
    setRoutePolicyError("");
    setNewRoutePolicy({
      plugin_id: "plugin.translation.gpt",
      task_type: "translate",
      model_chain: "deepseek-chat|gpt-4o-mini",
      disabled_models: "",
    });
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setActivityLogs((prev) => [`[${now}] 已填充路由策略模板`, ...prev].slice(0, 8));
  };

  const editRoutePolicy = (policy: AIRoutePolicy) => {
    setRoutePolicyError("");
    setNewRoutePolicy({
      plugin_id: policy.plugin_id,
      task_type: policy.task_type,
      model_chain: policy.model_chain,
      disabled_models: policy.disabled_models,
    });
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setActivityLogs((prev) => [`[${now}] 已加载策略到表单：${policy.id}`, ...prev].slice(0, 8));
  };

  const deleteRoutePolicy = async (policy: AIRoutePolicy) => {
    setLoadingAction(`删除路由策略 ${policy.id}`);
    const result = await apiPost("/api/v1/ai/route/policies/delete", { id: policy.id });
    setLastResult(result);
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setActivityLogs((prev) => [`[${now}] 删除路由策略 -> ${result.ok ? "成功" : "失败"}`, ...prev].slice(0, 8));
    void refreshAiOpsPanels();
    setLoadingAction("");
  };

  const togglePolicySelected = (id: string) => {
    setSelectedPolicyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const deleteSelectedPolicies = async () => {
    if (selectedPolicyIds.length === 0) {
      return;
    }
    setLoadingAction(`批量删除策略 (${selectedPolicyIds.length})`);
    const result = await apiPost("/api/v1/ai/route/policies/delete-batch", { ids: selectedPolicyIds });
    setLastResult(result);
    const now = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    setActivityLogs((prev) => [`[${now}] 批量删除策略 -> ${result.ok ? "成功" : "失败"}`, ...prev].slice(0, 8));
    setSelectedPolicyIds([]);
    void refreshAiOpsPanels();
    setLoadingAction("");
  };

  const statusColor = (status: PluginStatus) => {
    if (status === "运行中") return "#0f766e";
    if (status === "失败") return "#b91c1c";
    if (status === "未安装" || status === "已卸载") return "#6b7280";
    return "#1d4ed8";
  };

  const marketTrendData = [
    { month: "1月", value: 62 },
    { month: "2月", value: 70 },
    { month: "3月", value: 78 },
    { month: "4月", value: 74 },
  ];

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    background: "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(30,41,59,0.8))",
    boxShadow: "0 10px 30px rgba(2,132,199,0.22), inset 0 1px 0 rgba(148,163,184,0.2)",
    backdropFilter: "blur(10px)",
  };

  const buttonStyle: CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(56,189,248,0.5)",
    color: "#e0f2fe",
    background: "linear-gradient(180deg, rgba(14,116,144,0.45), rgba(30,64,175,0.3))",
    cursor: "pointer",
  };

  return (
    <main
      style={{
        padding: 24,
        background:
          "radial-gradient(circle at 12% 12%, rgba(37,99,235,0.25), transparent 34%), radial-gradient(circle at 82% 18%, rgba(6,182,212,0.18), transparent 30%), #020617",
        minHeight: "100vh",
        color: "#e2e8f0",
      }}
    >
      <h2 style={{ marginBottom: 6, color: "#7dd3fc", letterSpacing: 0.4 }}>插件控制台（MVP）</h2>
      <p style={{ marginTop: 0, color: "#93c5fd" }}>
        现在是可交互版本：支持完整生命周期操作，含状态、日志和结果面板。
        <strong style={{ color: "#e9d5ff" }}> AI 网关试调</strong>
        走 <code style={{ color: "#7dd3fc" }}>/api/v1/ai/invoke</code>
        （默认占位；后端配置 <code>AI_PROVIDER</code> 等后可连 DeepSeek / OpenAI 兼容接口）。
      </p>

      {demoPlugins.map((plugin) => (
        <section
          key={plugin.id}
          style={cardStyle}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>{plugin.name}</h3>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                color: "#fff",
                fontSize: 12,
                backgroundColor: statusColor(pluginStatus[plugin.id]),
                boxShadow: "0 0 18px rgba(56,189,248,0.45)",
              }}
            >
              {pluginStatus[plugin.id]}
            </span>
          </div>
          <p style={{ margin: "8px 0 4px", color: "#bfdbfe" }}>
            <strong>插件ID：</strong>
            <code>{plugin.id}</code>
          </p>
          <p style={{ margin: "4px 0 12px", color: "#bfdbfe" }}>
            <strong>权限：</strong>
            {plugin.permissions.join(" | ")}
          </p>

          {plugin.id === "plugin.translation.gpt" ? (
            <div style={{ display: "flex", gap: 12, margin: "10px 0 14px" }}>
              <label>
                源语言：
                <select
                  style={{ marginLeft: 6 }}
                  value={translationConfig.sourceLanguage}
                  onChange={(event) =>
                    setTranslationConfig((prev) => ({
                      ...prev,
                      sourceLanguage: event.target.value,
                    }))
                  }
                >
                  <option value="zh-CN">zh-CN</option>
                  <option value="en-US">en-US</option>
                  <option value="ja-JP">ja-JP</option>
                </select>
              </label>
              <label>
                目标语言：
                <select
                  style={{ marginLeft: 6 }}
                  value={translationConfig.targetLanguage}
                  onChange={(event) =>
                    setTranslationConfig((prev) => ({
                      ...prev,
                      targetLanguage: event.target.value,
                    }))
                  }
                >
                  <option value="en-US">en-US</option>
                  <option value="de-DE">de-DE</option>
                  <option value="fr-FR">fr-FR</option>
                </select>
              </label>
            </div>
          ) : (
            <div style={{ margin: "10px 0 14px" }}>
              <label>
                市场区域：
                <select
                  style={{ marginLeft: 6 }}
                  value={marketConfig.market}
                  onChange={(event) => setMarketConfig({ market: event.target.value })}
                >
                  <option value="global">global</option>
                  <option value="eu">eu</option>
                  <option value="us">us</option>
                  <option value="sea">sea</option>
                </select>
              </label>
              <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 8 }}>
                {marketTrendData.map((point) => (
                  <div key={point.month} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: 22,
                        height: point.value,
                        background: "linear-gradient(180deg, #22d3ee, #2563eb)",
                        borderRadius: 6,
                        boxShadow: "0 0 14px rgba(34,211,238,0.45)",
                      }}
                    />
                    <div style={{ fontSize: 11, color: "#bfdbfe", marginTop: 4 }}>{point.month}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              style={buttonStyle}
              onClick={() => installPlugin(plugin)}
              disabled={Boolean(loadingAction)}
            >
              安装
            </button>
            <button
              style={buttonStyle}
              onClick={() => configurePlugin(plugin)}
              disabled={Boolean(loadingAction)}
            >
              配置
            </button>
            <button
              style={buttonStyle}
              onClick={() => usePlugin(plugin)}
              disabled={Boolean(loadingAction)}
            >
              使用
            </button>
            <button
              style={{
                ...buttonStyle,
                border: "1px solid rgba(167,139,250,0.55)",
                background: "linear-gradient(180deg, rgba(91,33,182,0.4), rgba(30,64,175,0.25))",
              }}
              type="button"
              onClick={() => void invokeAiGateway(plugin)}
              disabled={Boolean(loadingAction)}
              title="调用 POST /api/v1/ai/invoke；默认 stub，配置 AI_* 后可走真实模型"
            >
              AI 网关试调
            </button>
            <button
              style={{
                ...buttonStyle,
                border: "1px solid rgba(248,113,113,0.55)",
                background: "linear-gradient(180deg, rgba(153,27,27,0.45), rgba(127,29,29,0.3))",
              }}
              onClick={() => uninstallPlugin(plugin)}
              disabled={Boolean(loadingAction)}
            >
              卸载
            </button>
          </div>
        </section>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section
          style={{
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "rgba(15,23,42,0.88)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>执行反馈</h3>
          <p style={{ minHeight: 20, color: "#bae6fd" }}>{actionHint || "等待操作..."}</p>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13,
              background: "#020617",
              color: "#93c5fd",
              borderRadius: 10,
              padding: 12,
              minHeight: 120,
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </section>

        <section
          style={{
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "rgba(15,23,42,0.88)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>操作日志</h3>
          {activityLogs.length === 0 ? (
            <p style={{ color: "#93c5fd" }}>暂无操作记录</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {activityLogs.map((item) => (
                <li key={item} style={{ marginBottom: 6, color: "#bae6fd" }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          style={{
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "rgba(15,23,42,0.88)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>AI 计费明细（最近 6 条）</h3>
          {aiBillingRecords.length === 0 ? (
            <p style={{ color: "#93c5fd" }}>暂无计费记录</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {aiBillingRecords.map((item) => (
                <li key={item.id} style={{ marginBottom: 6, color: "#bae6fd", fontSize: 13 }}>
                  {item.plugin_id} / {item.task_type} ｜{item.billed_units}u x {item.unit_price} ={" "}
                  {item.billed_amount} ｜{item.status} ｜余额 {item.wallet_balance_after}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          style={{
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "rgba(15,23,42,0.88)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>AI 路由策略概览</h3>
          <div style={{ marginBottom: 10 }}>
            <input
              value={routePolicyKeyword}
              onChange={(event) => setRoutePolicyKeyword(event.target.value)}
              placeholder="按插件 / 任务 / 模型关键字筛选"
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid rgba(56,189,248,0.35)",
                background: "rgba(2,6,23,0.8)",
                color: "#bae6fd",
                padding: "8px 10px",
                fontSize: 13,
              }}
            />
          </div>
          {filteredRoutePolicies.length > 0 ? (
            <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                style={{
                  ...buttonStyle,
                  padding: "6px 10px",
                  fontSize: 12,
                  border: "1px solid rgba(248,113,113,0.55)",
                  background: "linear-gradient(180deg, rgba(153,27,27,0.45), rgba(127,29,29,0.3))",
                }}
                type="button"
                disabled={Boolean(loadingAction) || selectedPolicyIds.length === 0}
                onClick={() => void deleteSelectedPolicies()}
              >
                批量删除（{selectedPolicyIds.length}）
              </button>
              <span style={{ color: "#93c5fd", fontSize: 12 }}>先勾选，再批量删除。</span>
            </div>
          ) : null}
          {aiRoutePolicies.length === 0 ? (
            <p style={{ color: "#93c5fd" }}>当前租户暂无路由策略（使用默认路由）</p>
          ) : filteredRoutePolicies.length === 0 ? (
            <p style={{ color: "#93c5fd" }}>未匹配到策略，请调整筛选关键字。</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {filteredRoutePolicies.slice(0, 8).map((item) => (
                <li key={item.id} style={{ marginBottom: 6, color: "#bae6fd", fontSize: 13 }}>
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedPolicyIds.includes(item.id)}
                      disabled={Boolean(loadingAction)}
                      onChange={() => togglePolicySelected(item.id)}
                      style={{ marginRight: 8 }}
                    />
                    {item.plugin_id} / {item.task_type} ｜链路 {item.model_chain || "-"} ｜禁用{" "}
                    {item.disabled_models || "-"}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 8 }}>
                    <button
                      style={{ ...buttonStyle, padding: "4px 8px", fontSize: 12 }}
                      type="button"
                      disabled={Boolean(loadingAction)}
                      onClick={() => editRoutePolicy(item)}
                    >
                      编辑
                    </button>
                    <button
                      style={{
                        ...buttonStyle,
                        padding: "4px 8px",
                        fontSize: 12,
                        border: "1px solid rgba(248,113,113,0.55)",
                        background: "linear-gradient(180deg, rgba(153,27,27,0.45), rgba(127,29,29,0.3))",
                      }}
                      type="button"
                      disabled={Boolean(loadingAction)}
                      onClick={() => void deleteRoutePolicy(item)}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          style={{
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "rgba(15,23,42,0.88)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>快速新增路由策略</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ color: "#bfdbfe", fontSize: 13 }}>
              插件 ID
              <input
                value={newRoutePolicy.plugin_id}
                onChange={(event) =>
                  setNewRoutePolicy((prev) => ({
                    ...prev,
                    plugin_id: event.target.value,
                  }))
                }
                style={{ marginLeft: 8, width: "70%" }}
              />
            </label>
            <label style={{ color: "#bfdbfe", fontSize: 13 }}>
              任务类型
              <input
                value={newRoutePolicy.task_type}
                onChange={(event) =>
                  setNewRoutePolicy((prev) => ({
                    ...prev,
                    task_type: event.target.value,
                  }))
                }
                style={{ marginLeft: 8, width: "70%" }}
              />
            </label>
            <label style={{ color: "#bfdbfe", fontSize: 13 }}>
              模型链路
              <input
                value={newRoutePolicy.model_chain}
                onChange={(event) =>
                  setNewRoutePolicy((prev) => ({
                    ...prev,
                    model_chain: event.target.value,
                  }))
                }
                style={{ marginLeft: 8, width: "70%" }}
              />
            </label>
            <label style={{ color: "#bfdbfe", fontSize: 13 }}>
              禁用模型（可选）
              <input
                value={newRoutePolicy.disabled_models}
                onChange={(event) =>
                  setNewRoutePolicy((prev) => ({
                    ...prev,
                    disabled_models: event.target.value,
                  }))
                }
                style={{ marginLeft: 8, width: "70%" }}
              />
            </label>
            <button
              style={buttonStyle}
              type="button"
              disabled={Boolean(loadingAction) || !newRoutePolicy.model_chain.trim()}
              onClick={() => void createRoutePolicy()}
            >
              保存策略
            </button>
            <button
              style={{
                ...buttonStyle,
                border: "1px solid rgba(192,132,252,0.55)",
                background: "linear-gradient(180deg, rgba(124,58,237,0.45), rgba(30,64,175,0.25))",
              }}
              type="button"
              disabled={Boolean(loadingAction)}
              onClick={applyRoutePolicyTemplate}
            >
              一键填充策略模板
            </button>
            {routePolicyError ? (
              <p style={{ margin: 0, color: "#fda4af", fontSize: 12 }}>{routePolicyError}</p>
            ) : null}
            {lastRoutePolicySubmit ? (
              <div
                style={{
                  marginTop: 2,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(56,189,248,0.35)",
                  background: "rgba(2,6,23,0.8)",
                  color: "#bae6fd",
                  fontSize: 12,
                }}
              >
                最近提交：ID {lastRoutePolicySubmit.id} ｜{lastRoutePolicySubmit.plugin_id} /{" "}
                {lastRoutePolicySubmit.task_type} ｜更新时间 {lastRoutePolicySubmit.updated_at || "-"}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
