export type TenantScoped = {
  tenantId: string;
};

export type UserModel = TenantScoped & {
  id: string;
  email: string;
  displayName: string;
  roleKeys: string[];
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type PluginMetadataModel = {
  id: string;
  pluginKey: string;
  name: string;
  category: string;
  latestVersion: string;
  permissions: string[];
  status: "draft" | "published" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type InstallPluginRequest = TenantScoped & {
  pluginId: string;
  version: string;
};

export type AIInvokeRequest = TenantScoped & {
  pluginId: string;
  taskType: string;
  payload: Record<string, unknown>;
};
