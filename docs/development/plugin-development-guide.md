# 插件开发指南（创建到发布）

本指南覆盖以下内容：

- 使用 `@core/plugin-sdk` 创建插件
- 使用 TypeScript 模板快速起步
- 在本地沙箱完成安装 -> 配置 -> 使用 -> 卸载全生命周期调试
- 验证权限隔离（访问未授权 API 失败）

## 1. 目录结构

- SDK: `core/plugin-sdk`
- 模板: `plugins/templates/typescript-plugin-template`
- 示例插件:
  - `plugins/examples/product-translation`
  - `plugins/examples/market-analysis`
- 沙箱工具: `plugins/sandbox/run_lifecycle_demo.py`

## 2. 创建插件

1. 复制模板目录 `plugins/templates/typescript-plugin-template`
2. 修改 `manifest.json`:
   - `id`（唯一）
   - `version`（语义化版本）
   - `permissions`（最小权限原则）
3. 在 `src/index.ts` 实现 `IPlugin` 四个核心钩子：
   - `onInstall()`
   - `onConfigure()`
   - `onExecute()`
   - `onUninstall()`

## 3. 生命周期钩子说明

- `onInstall()`：初始化数据（例如缓存、索引、默认配置）
- `onConfigure()`：处理插件配置（例如源语言/目标语言、市场区域）
- `onExecute()`：执行业务逻辑（调用 AI、请求平台 API、返回结果）
- `onUninstall()`：清理资源（删除缓存、停止定时任务）

## 4. 沙箱调试步骤

先确保后端运行在 `http://127.0.0.1:8000`，然后执行：

```bash
cd "D:/Limitless possibilities"
core/backend/.venv/Scripts/python plugins/sandbox/run_lifecycle_demo.py
```

### 预期日志示例

```text
[sandbox] install -> plugin.translation.gpt
(200, {"plugin_id":"plugin.translation.gpt","status":"installed"})
[sandbox] configure -> plugin.translation.gpt
(200, {"plugin_id":"plugin.translation.gpt","status":"configured"})
[sandbox] use -> plugin.translation.gpt (ai:invoke)
(200, {"plugin_id":"plugin.translation.gpt","status":"active"})
[sandbox] uninstall -> plugin.translation.gpt
(200, {"plugin_id":"plugin.translation.gpt","status":"uninstalled"})
[sandbox] permission isolation demo (expect 403):
(403, {"detail":"plugin 'plugin.translation.gpt' has no permission 'market:read'"})
```

## 5. 发布前检查清单

- `manifest.json` 权限声明是否最小化
- 生命周期钩子是否都有实现并有错误处理
- 沙箱权限隔离是否通过（未授权 API 必须失败）
- 插件版本号是否按语义化规范递增

## 6. MVP 示例说明

### 商品翻译插件

- 目录：`plugins/examples/product-translation`
- 功能：调用 GPT 任务类型 `translate-product`
- 配置界面：`sourceLanguage` / `targetLanguage`

### 市场分析插件

- 目录：`plugins/examples/market-analysis`
- 功能：调用 Composer 任务类型 `market-trend-analysis`
- 结果：返回趋势洞察 + 折线图数据（`month`/`demandIndex`）
