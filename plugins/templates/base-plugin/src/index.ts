export type PluginContext = {
  tenantId: string;
  userId: string;
  callAI: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export interface IPlugin {
  id: string;
  name: string;
  version: string;
  onInstall(ctx: PluginContext): Promise<void>;
  onActivate(ctx: PluginContext): Promise<void>;
  onDeactivate(ctx: PluginContext): Promise<void>;
}

export class BasePlugin implements IPlugin {
  id = "plugin.base-template";
  name = "基础插件模板";
  version = "0.1.0";

  async onInstall(_ctx: PluginContext): Promise<void> {
    // 参考 docs/architecture/stage-1-architecture.md 的生命周期规范
  }

  async onActivate(_ctx: PluginContext): Promise<void> {
    // 参考 docs/architecture/stage-1-architecture.md 的沙箱与权限规则
  }

  async onDeactivate(_ctx: PluginContext): Promise<void> {
    // 释放资源、停止任务
  }
}
