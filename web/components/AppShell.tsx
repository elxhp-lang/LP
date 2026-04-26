"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPost, getTenantId } from "@/lib/api";
import { LP_CURRENT_PROJECT_STORAGE_KEY } from "@/lib/constants";

const STORAGE_KEY = LP_CURRENT_PROJECT_STORAGE_KEY;

export type ProjectDto = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");

  const bare = pathname === "/login" || pathname === "/register";

  const loadProjects = useCallback(async () => {
    setLoadError("");
    const res = await apiGet("/api/v1/projects");
    if (!res.ok || !Array.isArray(res.data)) {
      setLoadError(typeof res.message === "string" ? res.message : "加载项目失败");
      setProjects([]);
      return;
    }
    const list = res.data as ProjectDto[];
    setProjects(list);
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : "";
    const valid = stored && list.some((p) => p.id === stored);
    if (valid && stored) {
      setCurrentId(stored);
    } else if (list.length > 0) {
      const first = list[0].id;
      setCurrentId(first);
      window.localStorage.setItem(STORAGE_KEY, first);
    } else {
      setCurrentId("");
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (bare) {
      return;
    }
    void loadProjects();
  }, [bare, loadProjects]);

  const onSelectProject = (id: string) => {
    setCurrentId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const onCreateProject = async () => {
    const name = window.prompt("项目名称", "新项目");
    if (!name?.trim()) {
      return;
    }
    const res = await apiPost("/api/v1/projects", { name: name.trim(), description: null });
    if (!res.ok) {
      window.alert(typeof res.message === "string" ? res.message : "创建失败");
      return;
    }
    await loadProjects();
    const created = res.data as ProjectDto | null;
    if (created?.id) {
      onSelectProject(created.id);
    }
  };

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-md)",
          padding: "var(--space-md) var(--space-xl)",
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "var(--color-bg-surface)",
        }}
      >
        <strong style={{ color: "var(--color-accent)", letterSpacing: 0.5 }}>LP</strong>
        <nav style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
          <Link className="app-link" href="/">
            首页
          </Link>
          <Link className="app-link" href="/dashboard/plugins">
            插件控制台
          </Link>
          <Link className="app-link" href="/chat">
            对话
          </Link>
          <Link className="app-link" href="/market">
            市场
          </Link>
          <Link className="app-link" href="/workflow">
            工作流
          </Link>
          <Link className="app-link" href="/login">
            登录
          </Link>
          <Link className="app-link" href="/register">
            注册
          </Link>
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>租户 {getTenantId()}</span>
          <label style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
            当前项目
            <select
              style={{
                marginLeft: 8,
                padding: "4px 8px",
                borderRadius: "var(--radius-control)",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--color-code-bg)",
                color: "var(--color-text-primary)",
              }}
              value={currentId}
              onChange={(e) => onSelectProject(e.target.value)}
              disabled={projects.length === 0}
            >
              {projects.length === 0 ? (
                <option value="">暂无项目</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void onCreateProject()}
            style={{
              padding: "6px 10px",
              borderRadius: "var(--radius-control)",
              border: "1px solid var(--color-border-strong)",
              background: "transparent",
              color: "var(--color-accent)",
              cursor: "pointer",
            }}
          >
            新建项目
          </button>
        </div>
      </header>
      {loadError ? (
        <div
          style={{
            padding: "var(--space-sm) var(--space-xl)",
            background: "rgba(185, 28, 28, 0.2)",
            color: "var(--color-danger)",
            fontSize: 13,
          }}
        >
          项目列表加载失败（请确认后端已启动）：{loadError}
        </div>
      ) : null}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
