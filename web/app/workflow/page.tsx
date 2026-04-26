"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import { LP_CURRENT_PROJECT_STORAGE_KEY } from "@/lib/constants";

type WorkflowRow = {
  id: string;
  tenant_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  definition: { version?: number; steps: Array<{ plugin_id: string; title: string }> };
  created_at?: string;
};

export default function WorkflowPage() {
  const [rows, setRows] = useState<WorkflowRow[]>([]);
  const [selected, setSelected] = useState<WorkflowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LP_CURRENT_PROJECT_STORAGE_KEY)
        : null;
    setProjectFilter(q);
    const path = q ? `/api/v1/workflows?project_id=${encodeURIComponent(q)}` : "/api/v1/workflows";
    const res = await apiGet(path);
    setLoading(false);
    if (res.ok && Array.isArray(res.data)) {
      const list = res.data as WorkflowRow[];
      setRows(list);
      setSelected((cur) => {
        if (cur && list.some((w) => w.id === cur.id)) {
          return list.find((w) => w.id === cur.id) ?? null;
        }
        return list[0] ?? null;
      });
    } else {
      setRows([]);
      setSelected(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = selected?.definition?.steps ?? [];

  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 960 }}>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.25rem", marginTop: 0 }}>工作流</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        首期<strong>只读</strong>：查看已保存的线性步骤（与 Agent 草案同一结构）。后续再接 DAG 编辑与执行日志。
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
        {projectFilter
          ? `当前筛选：顶栏所选项目下的工作流。`
          : `未选项目：展示租户下全部工作流。`}
      </p>

      <div style={{ display: "flex", gap: "var(--space-lg)", alignItems: "flex-start", flexWrap: "wrap" }}>
        <section
          style={{
            flex: "0 0 260px",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-card)",
            background: "var(--color-bg-surface)",
            maxHeight: 420,
            overflow: "auto",
          }}
        >
          <div
            style={{
              padding: "var(--space-sm) var(--space-md)",
              borderBottom: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "var(--color-text-primary)", fontSize: 14 }}>已保存</span>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "transparent",
                color: "var(--color-accent)",
                cursor: "pointer",
              }}
            >
              刷新
            </button>
          </div>
          {loading ? (
            <p style={{ padding: "var(--space-md)", color: "var(--color-text-muted)", fontSize: 14 }}>
              加载中…
            </p>
          ) : rows.length === 0 ? (
            <p style={{ padding: "var(--space-md)", color: "var(--color-text-muted)", fontSize: 14 }}>
              暂无工作流。在「对话」页生成推荐后，可点击「保存为工作流」。
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {rows.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(w)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "var(--space-sm) var(--space-md)",
                      border: "none",
                      borderBottom: "1px solid var(--color-border-subtle)",
                      background:
                        selected?.id === w.id
                          ? "rgba(14,116,144,0.2)"
                          : "transparent",
                      color: "var(--color-text-primary)",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {w.created_at ? String(w.created_at).slice(0, 19) : w.id.slice(0, 8)}…
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          style={{
            flex: "1 1 320px",
            minWidth: 280,
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-card)",
            padding: "var(--space-lg)",
            background: "var(--color-code-bg)",
          }}
        >
          {!selected ? (
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>请选择左侧一条工作流。</p>
          ) : (
            <>
              <h2 style={{ marginTop: 0, color: "var(--color-accent)", fontSize: "1.05rem" }}>
                {selected.name}
              </h2>
              {selected.description ? (
                <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>{selected.description}</p>
              ) : null}
              <h3 style={{ color: "var(--color-text-primary)", fontSize: "0.95rem" }}>步骤（线性）</h3>
              <ol style={{ margin: 0, paddingLeft: 20, color: "var(--color-text-secondary)" }}>
                {steps.map((s) => (
                  <li key={`${selected.id}-${s.plugin_id}-${s.title}`} style={{ marginBottom: 12 }}>
                    <div>{s.title}</div>
                    <code style={{ fontSize: 12, color: "var(--color-accent)" }}>{s.plugin_id}</code>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
