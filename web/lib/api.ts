import { LP_CURRENT_PROJECT_STORAGE_KEY } from "./constants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant_demo";

function projectHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }
  const id = window.localStorage.getItem(LP_CURRENT_PROJECT_STORAGE_KEY);
  return id ? { "x-project-id": id } : {};
}

export function getTenantId() {
  return TENANT_ID;
}

export async function apiGet(path: string) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        "x-tenant-id": TENANT_ID,
        ...projectHeaders(),
      },
    });
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      message: typeof data?.detail === "string" ? data.detail : "ok",
      data,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "unknown error",
      data: null,
    };
  }
}

export async function apiPost(path: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": TENANT_ID,
        ...projectHeaders(),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return { ok: response.ok, message: data?.detail ?? "ok", data };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "unknown error",
      data: null,
    };
  }
}
