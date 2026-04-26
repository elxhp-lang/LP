import type { IPlugin, PluginContext, PluginManifest } from "@core/plugin-sdk";

type TranslationConfig = {
  sourceLanguage: string;
  targetLanguage: string;
};

export const translationConfigSchema = {
  title: "商品翻译设置",
  fields: [
    { key: "sourceLanguage", type: "select", options: ["zh-CN", "en-US", "ja-JP"] },
    { key: "targetLanguage", type: "select", options: ["en-US", "de-DE", "fr-FR"] },
  ],
};

export class ProductTranslationPlugin implements IPlugin {
  manifest: PluginManifest = {
    id: "plugin.translation.gpt",
    name: "Product Translation Plugin",
    version: "0.1.0",
    permissions: ["ai:invoke", "i18n:read", "i18n:write"],
  };

  private config: TranslationConfig = {
    sourceLanguage: "zh-CN",
    targetLanguage: "en-US",
  };

  async onInstall(ctx: PluginContext): Promise<void> {
    // Initialize translation glossary placeholder data.
    ctx.logger.info("onInstall: translation glossary initialized");
  }

  async onConfigure(_ctx: PluginContext, config: Record<string, unknown>): Promise<void> {
    this.config = {
      sourceLanguage: String(config.sourceLanguage ?? "zh-CN"),
      targetLanguage: String(config.targetLanguage ?? "en-US"),
    };
  }

  async onExecute(ctx: PluginContext, payload: Record<string, unknown>): Promise<unknown> {
    const text = String(payload.text ?? "");
    return ctx.callAI({
      taskType: "translate-product",
      sourceLanguage: this.config.sourceLanguage,
      targetLanguage: this.config.targetLanguage,
      text,
    });
  }

  async onUninstall(ctx: PluginContext): Promise<void> {
    // Remove temporary translation cache.
    ctx.logger.info("onUninstall: translation cache cleared");
  }
}
