import type { IPlugin, PluginContext, PluginManifest } from "@core/plugin-sdk";

export class TemplatePlugin implements IPlugin {
  manifest: PluginManifest = {
    id: "plugin.template.typescript",
    name: "TypeScript Plugin Template",
    version: "0.1.0",
    permissions: ["ai:invoke"],
  };

  async onInstall(ctx: PluginContext): Promise<void> {
    // Initialize local data or cache at install time.
    ctx.logger.info("onInstall called");
  }

  async onConfigure(ctx: PluginContext, config: Record<string, unknown>): Promise<void> {
    // Persist or validate plugin configuration from UI.
    ctx.logger.info("onConfigure called", config);
  }

  async onExecute(ctx: PluginContext, payload: Record<string, unknown>): Promise<unknown> {
    // Execute the plugin task and call platform APIs through ctx.
    return ctx.callAI({ taskType: "template-task", payload });
  }

  async onUninstall(ctx: PluginContext): Promise<void> {
    // Cleanup all temp files and scheduled jobs.
    ctx.logger.info("onUninstall called");
  }
}
