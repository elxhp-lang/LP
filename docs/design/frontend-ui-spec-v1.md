# 前端 UI 规范与页面整体设计（初版 v1）

> **状态**：待产品负责人确认后冻结为 v1 基线。  
> **目标**：统一视觉与布局语言，并显式列出**页面 ↔ API ↔ 环境配置**，避免开发过程遗漏交互或配置。

---

## 1. 适用范围与原则

| 项 | 说明 |
|----|------|
| 终端 | 首期以 **Web（Next.js App Router）** 为主；移动端沿用同一套 **Design Token 与接口契约**，布局单独适配 |
| 风格 | **科技风**：深色基底、冷色强调、高可读数据面板；避免装饰性渐变滥用，**状态与操作**优先清晰 |
| 架构 | **配置驱动**：API 基址、租户、功能开关等来自环境变量或后续「运行时配置接口」，不写死在业务分支里 |
| 插件 | UI 只依赖 **插件 manifest + 平台 API**；插件专属配置表单由 schema 描述，避免硬编码插件 ID 散落（过渡期允许白名单映射表集中维护） |

---

## 2. Design Token（初版）

以下为 **CSS 变量命名建议**（可在 `web/app/globals.css` 或根布局中集中定义，组件只引用变量）。

### 2.1 色彩

| Token | 用途 | 建议值（深色主题） |
|-------|------|-------------------|
| `--color-bg-base` | 页面背景 | `#020617` |
| `--color-bg-surface` | 卡片/面板 | `rgba(15, 23, 42, 0.88)` |
| `--color-border-subtle` | 分割线/弱边框 | `rgba(56, 189, 248, 0.25)` |
| `--color-border-strong` | 聚焦/选中 | `rgba(56, 189, 248, 0.45)` |
| `--color-text-primary` | 主文案 | `#e2e8f0` |
| `--color-text-secondary` | 次要说明 | `#93c5fd` / `#94a3b8` |
| `--color-accent` | 主操作、链接 | `#38bdf8` |
| `--color-success` | 成功状态 | `#2dd4bf` |
| `--color-warning` | 警告 | `#fbbf24` |
| `--color-danger` | 错误、危险操作 | `#f87171` |
| `--color-code-bg` | 日志/JSON 区 | `#020617` |

### 2.2 字体与排版

| Token | 规则 |
|-------|------|
| 字体栈 | `system-ui, "Segoe UI", Roboto, "PingFang SC", sans-serif` |
| 标题 | H1 页面级、H2 区块级、H3 卡片标题；**不超过三级**避免噪音 |
| 正文 | 14–16px，行高 1.5；数字/代码区可用等宽 `ui-monospace, monospace` |

### 2.3 间距与圆角

| Token | 值 |
|-------|-----|
| `--space-xs` ~ `--space-xl` | 4, 8, 12, 16, 24（px） |
| `--radius-card` | 12–16px |
| `--radius-control` | 8–10px |

### 2.4 交互状态

- **按钮**：默认 / `:hover` / `:disabled`（降低透明度 + 禁止指针）
- **加载**：区块内 `aria-busy` + 文案「处理中…」，禁止重复提交
- **错误**：统一用 **Callout 条** 或 **行内红色辅助文案**，并保留 `traceId` 或 `detail` 供联调

---

## 3. 全局布局框架

```
┌─────────────────────────────────────────────────────────┐
│ 顶栏：Logo | 当前项目 [切换] | 模式切换 | 用户/设置        │
├────────────┬────────────────────────────────────────────┤
│ 侧栏（可选）│ 主内容区（页面路由）                         │
│ 导航/快捷   │                                             │
└────────────┴────────────────────────────────────────────┘
```

- **顶栏必选**：项目上下文、模式入口（与 Phase 对齐后再接路由）
- **侧栏**：仪表盘类页面可折叠；登录/注册全屏无侧栏
- **移动端**：顶栏压缩为 **底栏或抽屉导航**；Token 不变，仅改断点布局（v1 文档先锁定 Web，移动在附录标记「同 Token、布局另稿」）

---

## 4. 页面地图（IA）与职责

| 路由（建议） | 页面名 | 核心职责 | 主要交互对象（后端） |
|--------------|--------|----------|----------------------|
| `/` | 首页/落地 | 价值说明、登录入口 | 静态或可接 `GET /health` |
| `/login` | 登录 | 表单、错误提示 | `POST /api/v1/auth/login` + `x-tenant-id` |
| `/register` | 注册 | 表单、错误提示 | `POST /api/v1/auth/register` |
| `/dashboard/plugins` | 插件控制台 | 生命周期演示、配置、日志、**AI 网关试调** | `install/configure/use/uninstall` + `POST /api/v1/ai/invoke` |
| `/chat`（预留） | 对话模式 | 超级 Agent 对话、推荐卡、成交引导 | 预留 `POST /api/v1/agent/...` 或 SSE |
| `/market` | 插件市场 | 列表、安装入口 | `GET /api/v1/marketplace/plugins` + `POST /api/v1/plugins/install` |
| `/market/[pluginId]` | 插件详情 | 详情、案例、安装入口 | `GET /api/v1/marketplace/plugins/{plugin_id}` + `POST /api/v1/plugins/install` |
| `/workflow`（预留） | 工作流 | 只读/可编 DAG、步骤状态 | 预留工作流 API |
| `/settings`（预留） | 设置 | 租户、模型、密钥占位（仅 UI） | 预留配置 API |
| `/chat` | 对话模式 | 超级 Agent 对话（占位） | 预留 Agent API |
| `/market` | 插件市场 | 浏览、搜索、分类、分页与安装（已接 API） | 市场目录（支持查询参数）+ 分类 + 安装接口 |
| `/workflow` | 工作流 | 可视化 DAG（占位） | 预留工作流 API |

**说明**：已存在页面先对齐本规范的 Token；预留路由可在导航中显示「即将推出」或暂不露出，避免遗漏扩展点。  
**顶栏项目切换**：`AppShell` 调用 `GET/POST /api/v1/projects`，当前项目 ID 存 `localStorage` 键 `lp_current_project_id`（后续 Agent / 工作流接口可读取）。  
**请求上下文**：`web/lib/api.ts` 在浏览器中自动为 `apiGet` / `apiPost` 附加 `x-project-id`（若已选项目）。调试可用 `GET /api/v1/context`。

---

## 5. 页面级线框说明（初版）

### 5.1 插件控制台（已实现，对齐规范）

- **区块**：插件卡片（标题、ID、权限 Pill、状态徽章、配置区、**安装 / 配置 / 使用 / AI 网关试调 / 卸载**、底部双栏「执行反馈 + 操作日志」）
- **状态**：未安装 / 已安装 / 已配置 / 运行中 / 已卸载 / 失败（颜色用 Token）
- **必须**：所有写操作按钮在请求中 **禁用防重复**；失败时 **保留上一次成功/失败 JSON**

### 5.2 对话模式（预留）

- **左/主**：消息列表 + 输入框
- **右/下**：当前推荐包（插件列表、费用、案例摘要）、CTA（购买/充值/开始执行）
- **必须**：每条助手消息可关联 `recommendationId` / `workflowDraftId`（后续接口字段）

### 5.3 插件自配 + 市场（预留）

- **市场**：筛选、卡片列表、详情抽屉
- **篮子**：已选插件、冲突提示条（来自后端校验）
- **助手条**：固定底部或右侧，同步展示 Agent 提示（配置缺失、需充值）

### 5.4 工作流（预留）

- **画布区**：节点 = 插件步骤，边 = 依赖；图例说明状态色
- **侧栏**：当前选中节点配置、执行日志

---

## 6. 前后端交互矩阵（防遗漏）

以下 **Header** 若无特殊说明，业务 API 均需：

| Header | 值来源 | 说明 |
|--------|--------|------|
| `Content-Type` | `application/json` | POST JSON |
| `x-tenant-id` | `NEXT_PUBLIC_TENANT_ID` 或用户/项目上下文 | 与中间件一致 |
| `x-project-id` | `localStorage` 键 `lp_current_project_id`（与 `web/lib/constants.ts` 一致） | 可选；若携带则须属于当前租户，否则 **404** |

### 6.1 已对齐接口（示例）

| UI 位置 | 方法 | 路径 | Body 要点 | 成功 UI 反馈 |
|---------|------|------|-----------|--------------|
| 登录 | POST | `/api/v1/auth/login` | email, password | 跳转 + token 存储（后续） |
| 注册 | POST | `/api/v1/auth/register` | email, password, display_name | 跳转或登录 |
| 插件安装 | POST | `/api/v1/plugins/install` | plugin_id, version | 状态徽章「已安装」 |
| 插件配置 | POST | `/api/v1/plugins/configure` | plugin_id, config | 「已配置」 |
| 插件使用 | POST | `/api/v1/plugins/use` | plugin_id, action, api_name? | 「运行中」+ JSON（返回 `lifecycle_events`；`api_name=ai:invoke` 时带 `output`） |
| 插件卸载 | POST | `/api/v1/plugins/uninstall/{plugin_id}` | - | 「已卸载」 |
| 项目列表 | GET | `/api/v1/projects` | - | 顶栏下拉 |
| 创建项目 | POST | `/api/v1/projects` | name, description? | 刷新列表并选中 |
| 项目详情 | GET | `/api/v1/projects/{project_id}` | - | 详情页预留 |
| 对话推荐（规则引擎） | POST | `/api/v1/agent/recommend` | `message` | `/chat` 展示意图摘要、插件卡、工作流草案 |
| 运行前检查 | POST | `/api/v1/agent/preflight` | `plugin_ids` | 根据购买记录与余额返回 `allowed`/`needs_purchase`/`needs_topup` |
| 工作流列表 | GET | `/api/v1/workflows` | Query：`project_id?` | `/workflow` 左侧列表；未选项目则列租户全部 |
| 工作流创建 | POST | `/api/v1/workflows` | `name`, `description?`, `project_id?`, `steps[]` | 对话页「保存为工作流」；未传 `project_id` 时用 Header 上下文 |
| 工作流详情 | GET | `/api/v1/workflows/{workflow_id}` | - | 详情与只读步骤（预留扩展 GET 列表已含 definition） |
| 市场目录 | GET | `/api/v1/marketplace/plugins` | Query：`q?`,`category?`,`offset?`,`limit?` | `/market` 列表 + 搜索 + 分类 + 分页 |
| 市场分类 | GET | `/api/v1/marketplace/categories` | - | `/market` 分类下拉 |
| 市场详情 | GET | `/api/v1/marketplace/plugins/{plugin_id}` | - | `/market/[pluginId]` 详情页（案例 + 安装） |
| 钱包余额 | GET | `/api/v1/billing/wallet` | - | 详情页展示余额 |
| 支付/收款渠道 | GET | `/api/v1/billing/channels` | - | 展示可选支付渠道与收款渠道（MVP：支付宝/微信优先） |
| 钱包充值（占位） | POST | `/api/v1/billing/wallet/topup` | `amount` | 余额变更（后续接真实支付） |
| 创建购买记录（占位） | POST | `/api/v1/billing/purchase` | `plugin_id`, `amount`, `currency` | 购买按钮状态与提示 |
| 创建支付订单 | POST | `/api/v1/billing/checkout` | `plugin_id`,`amount`,`currency`,`pay_channel` | 返回订单状态、下一步动作、收银台链接占位 |
| 支付结果确认（回调占位） | POST | `/api/v1/billing/checkout/confirm` | `order_id`,`paid`,`provider_trade_no?` | 更新订单为 `paid/failed` |
| 订单详情 | GET | `/api/v1/billing/purchases/{order_id}` | - | `/billing/orders/[orderId]` 状态页自动刷新，并在已支付后触发安装 |
| 购买列表（占位） | GET | `/api/v1/billing/purchases` | - | 订单页预留 |
| 购买回跳预检 | GET（前端路由参数） | `/chat?autopreflight=1` | - | 从购买链路返回对话后自动再跑 preflight |
| 支付安装完成提示 | GET（前端路由参数） | `/chat?flow_ready=1` | - | 聊天页显示“已就绪可执行”提示 |
| 推荐流程执行（前端编排） | POST（逐步） | `/api/v1/plugins/use` | `plugin_id`,`action`,`api_name=ai:invoke` | 聊天页“一键运行推荐流程”逐步执行并显示日志 |
| 执行摘要卡（前端状态） | localStorage | `lp_last_flow_run_summary` | - | 聊天页展示最近一次执行成功/失败统计 |
| AI 调度 | POST | `/api/v1/ai/invoke` | `plugin_id`, `task_type`, `payload` | 插件/内部调用；后端按 `AI_PROVIDER` + `AI_TASK_MODEL_MAP` 命中候选模型链路，失败自动降级到 `AI_MODEL` 与 `AI_FALLBACK_MODELS` |
| AI 用量摘要 | GET | `/api/v1/ai/usage/summary` | - | 聊天页显示当月配额、已用量、成功/失败调用次数 |
| AI 配额设置（占位） | POST | `/api/v1/ai/quota` | `quota_units` | 管理侧可调整租户月度配额（MVP 直接接口） |
| AI 审计日志 | GET | `/api/v1/ai/audit/logs` | Query: `offset?`,`limit?` | 聊天页展示最近调用记录（状态/错误摘要） |

### 6.2 预留接口（命名空间建议）

| 能力 | 建议前缀 | UI 依赖 |
|------|-----------|---------|
| 超级 Agent 对话 | `/api/v1/agent/*` | 对话页、推荐卡 |
| 插件市场 | `/api/v1/marketplace/*` | 市场列表、详情（**MVP：目录 + 详情路由已提供，上架/订单后续接**） |
| 工作流 | `/api/v1/workflows/*` | 画布、步骤条 |
| 项目 | `/api/v1/projects/*` | 顶栏项目切换 |
| 计费/订单 | `/api/v1/billing/*` | 充值、购买按钮状态 |

**错误约定**：统一解析 `detail`（string 或数组）；UI 必须展示 **可读懂的一句话**，开发环境可展开原始 JSON。

---

## 7. UI 配置清单（环境变量）

| 变量 | 用途 | 示例 | 必填 |
|------|------|------|------|
| `NEXT_PUBLIC_API_BASE_URL` | 后端基址 | `http://localhost:8000` | 是 |
| `NEXT_PUBLIC_TENANT_ID` | 默认租户 | `tenant_demo` | 是（MVP） |
| `NEXT_PUBLIC_APP_NAME` | 顶栏/标题 | `LP` | 否 |
| `NEXT_PUBLIC_FEATURE_AGENT_CHAT` | 对话模式开关 | `false` | 否 |
| `NEXT_PUBLIC_FEATURE_MARKETPLACE` | 市场上线开关 | `false` | 否 |

**原则**：新页面开发前先查本表；**新增能力必须补一行**，避免「页面写了、配置没文档」。  
**模板文件**：`web/.env.example`（复制为 `web/.env.local` 使用）。

---

## 8. 组件与复用约定

| 组件层级 | 说明 |
|----------|------|
| **Primitive** | Button、Input、Select、Card、Badge、Callout（建议逐步抽到 `web/components/ui/`） |
| **Composite** | PluginCard、ApiResultPanel、ActivityLogList、AppShell（顶栏+主槽） |
| **Page** | 仅组装 Composite，不写裸 `fetch` 分散逻辑；统一走 `lib/api.ts` 或后续 `lib/api/*` |

**API 客户端**：继续扩展 `web/lib/api.ts`（或按域拆分），保证 **租户头、错误解析、类型** 一处维护。

---

## 9. 开发自检清单（每个需求必过）

- [ ] 本页使用的 API 已写入 **§6 矩阵**（或注明预留路径）
- [ ] 所需 **§7 环境变量** 已文档化，`.env.example` 已更新（若有）
- [ ] 加载/空/错误/成功 **四态** 至少覆盖三种
- [ ] 操作按钮 **防重复提交**
- [ ] 新插件能力是否只通过 **manifest + 配置 schema**，未硬编码散落于多页面
- [ ] 与 **Design Token** 一致，无页面私有「魔法色」大面积出现

---

## 10. 附录：与架构文档关系

- 技术架构：`docs/architecture/stage-1-architecture.md`
- 插件开发：`docs/development/plugin-development-guide.md`
- 环境启动：`docs/development/stage-2-dev-setup.md`

---

## 11. 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0-draft | 2026-04-26 | 初稿：科技风 Token、页面地图、交互矩阵、配置清单、自检表 |

确认人：___________  日期：___________  

确认后请在版本记录中补充「v1.0-frozen」行。
