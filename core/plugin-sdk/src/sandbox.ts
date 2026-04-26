import type { IPlugin, PluginContext } from "./index.js";

type SandboxOptions = {
  tenantId: string;
  userId: string;
  allowedApis: string[];
};

export class LocalSandbox {
  private readonly options: SandboxOptions;

  constructor(options: SandboxOptions) {
    this.options = options;
  }

  buildContext(): PluginContext {
    return {
      tenantId: this.options.tenantId,
      userId: this.options.userId,
      callAI: async (payload) => ({ mocked: true, payload }),
      callAPI: async (apiName, payload) => {
        if (!this.options.allowedApis.includes(apiName)) {
          throw new Error(`permission denied in sandbox: ${apiName}`);
        }
        return { ok: true, apiName, payload };
      },
      logger: {
        info: (message, meta) => {
          const serialized = meta ? ` ${JSON.stringify(meta)}` : "";
          console.log(`[sandbox] ${message}${serialized}`);
        },
      },
    };
  }
}

export const runLifecycle = async (
  plugin: IPlugin,
  config: Record<string, unknown>,
  payload: Record<string, unknown>,
) => {
  const sandbox = new LocalSandbox({
    tenantId: "sandbox-tenant",
    userId: "sandbox-user",
    allowedApis: plugin.manifest.permissions,
  });
  const ctx = sandbox.buildContext();
  await plugin.onInstall(ctx);
  await plugin.onConfigure(ctx, config);
  const result = await plugin.onExecute(ctx, payload);
  await plugin.onUninstall(ctx);
  return result;
};
