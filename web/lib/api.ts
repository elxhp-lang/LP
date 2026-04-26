const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? "tenant_demo";

export async function apiPost(path: string, body: Record<string, unknown>) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": TENANT_ID,
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
