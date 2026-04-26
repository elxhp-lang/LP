"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { apiPost } from "@/lib/api";

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

  const actionHint = useMemo(() => {
    if (!loadingAction) {
      return "";
    }
    return `执行中：${loadingAction}`;
  }, [loadingAction]);

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

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
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
      </div>
    </main>
  );
}
