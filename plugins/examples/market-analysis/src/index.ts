import type { IPlugin, PluginContext, PluginManifest } from "@core/plugin-sdk";

export const marketChartConfig = {
  chartType: "line",
  xField: "month",
  yField: "demandIndex",
};

export class MarketAnalysisPlugin implements IPlugin {
  manifest: PluginManifest = {
    id: "plugin.market.analysis.composer",
    name: "Market Analysis Plugin",
    version: "0.1.0",
    permissions: ["ai:invoke", "market:read", "chart:render"],
  };

  private market = "global";

  async onInstall(ctx: PluginContext): Promise<void> {
    // Initialize local market snapshots.
    ctx.logger.info("onInstall: market cache initialized");
  }

  async onConfigure(_ctx: PluginContext, config: Record<string, unknown>): Promise<void> {
    this.market = String(config.market ?? "global");
  }

  async onExecute(ctx: PluginContext, payload: Record<string, unknown>): Promise<unknown> {
    const category = String(payload.category ?? "all");
    const insight = await ctx.callAI({
      taskType: "market-trend-analysis",
      provider: "composer",
      market: this.market,
      category,
    });

    return {
      insight,
      chart: {
        ...marketChartConfig,
        data: [
          { month: "2026-01", demandIndex: 61 },
          { month: "2026-02", demandIndex: 67 },
          { month: "2026-03", demandIndex: 74 },
        ],
      },
    };
  }

  async onUninstall(ctx: PluginContext): Promise<void> {
    // Remove all cached market data.
    ctx.logger.info("onUninstall: market cache cleared");
  }
}
