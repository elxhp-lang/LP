export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  permissions: string[];
};

export type PluginContext = {
  tenantId: string;
  userId: string;
  callAI: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  callAPI: (apiName: string, payload?: Record<string, unknown>) => Promise<unknown>;
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
  };
};

export interface IPlugin {
  manifest: PluginManifest;
  onInstall(ctx: PluginContext): Promise<void>;
  onConfigure(ctx: PluginContext, config: Record<string, unknown>): Promise<void>;
  onExecute(ctx: PluginContext, payload: Record<string, unknown>): Promise<unknown>;
  onUninstall(ctx: PluginContext): Promise<void>;
}

export class LifecycleExamplePlugin implements IPlugin {
  manifest: PluginManifest = {
    id: "plugin.lifecycle.example",
    name: "Lifecycle Example Plugin",
    version: "0.1.0",
    permissions: ["ai:invoke"],
  };

  async onInstall(ctx: PluginContext): Promise<void> {
    ctx.logger.info("onInstall: initialize plugin data");
  }

  async onConfigure(ctx: PluginContext, config: Record<string, unknown>): Promise<void> {
    ctx.logger.info("onConfigure: save plugin config", config);
  }

  async onExecute(ctx: PluginContext, payload: Record<string, unknown>): Promise<unknown> {
    ctx.logger.info("onExecute: start plugin task", payload);
    return ctx.callAI({ taskType: "generic", payload });
  }

  async onUninstall(ctx: PluginContext): Promise<void> {
    ctx.logger.info("onUninstall: cleanup resources");
  }
}

export const createPlatformClient = (baseUrl: string, tenantId: string) => {
  const headers = {
    "content-type": "application/json",
    "x-tenant-id": tenantId,
  };

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`request failed: ${res.status} ${path}`);
    }
    return res.json();
  };

  return {
    installPlugin: (pluginId: string, version: string) =>
      post("/api/v1/plugins/install", { plugin_id: pluginId, version }),
    configurePlugin: (pluginId: string, config: Record<string, unknown>) =>
      post("/api/v1/plugins/configure", { plugin_id: pluginId, config }),
    usePlugin: (pluginId: string, action: string, apiName?: string) =>
      post("/api/v1/plugins/use", {
        plugin_id: pluginId,
        action,
        api_name: apiName ?? null,
      }),
    uninstallPlugin: (pluginId: string) =>
      post(`/api/v1/plugins/uninstall/${pluginId}`, {}),
  };
};

export { LocalSandbox, runLifecycle } from "./sandbox.js";
