# 项目记忆库变更记录

## 说明
- 本文件记录“记忆库本身”的新增、修改、废弃。
- 每次变更需写明变更原因与影响，保证长期追踪。

---

## 2026-04-24

### CHG-001：初始化项目记忆库文档体系
- 变更内容：
  - 新增 `docs/memory/project-memory.md`
  - 新增 `docs/memory/decisions.md`
  - 新增 `docs/memory/change-log.md`
- 变更原因：将会话级约定沉淀为仓库级长期资产，支持团队共享与跨周期协作。
- 影响范围：项目治理流程、需求评审、开发执行与知识传承。

### CHG-002：新增治理补充条款
- 变更内容：加入“任何关键决策或关键行为必须可长期复用与团队共享”规则，并设为强约束。
- 变更原因：提升项目可持续开发能力，防止知识孤岛与规范漂移。
- 影响范围：所有后续文档、方案、代码实施与评审流程。

### CHG-003：固化核心目标与三阶段交付物
- 变更内容：
  - 在主记忆库新增“核心目标（新增基线）”。
  - 在主记忆库新增“主要交付物（阶段细化）”。
  - 在决策日志新增 `DEC-006`，用于约束后续里程碑执行。
- 变更原因：明确项目执行方向与验收边界，保证阶段产出可评估、可追踪。
- 影响范围：产品规划、技术实现、测试验收、项目管理协同。

### CHG-004：新增协作规则长期沉淀机制
- 变更内容：
  - 在主记忆库新增“沟通与协作基准（用户偏好）”。
  - 在执行规则中增加“提示词先做风险评估、关键改动先确认”的约束。
  - 在决策日志新增 `DEC-007`，固定“协作偏好主动记录”机制。
- 变更原因：提升长期协作连续性，减少信息丢失与执行偏差。
- 影响范围：需求沟通方式、实施节奏、确认流程与文档维护策略。

### CHG-005：新增 GitHub“确认后推送”协作流程
- 变更内容：
  - 在主记忆库新增“半自动确认”入库流程说明。
  - 在决策日志新增 `DEC-008`，约束“先清单，后确认，再推送”。
- 变更原因：兼顾效率与安全，避免自动推送引发误操作。
- 影响范围：测试执行时机、提交推送动作、结果回报规范。

### CHG-006：完成阶段二核心平台代码骨架初始化
- 变更内容：
  - 新增 `web/` Next.js 15 App Router 骨架（登录、注册、插件管理页）。
  - 新增 `core/backend/` FastAPI 骨架（认证、插件管理、AI 调度、WebSocket 预留）。
  - 新增 `core/types/` 共享 TypeScript 模型与 `plugins/templates/` 插件模板。
  - 新增 Docker 与开发说明（`docker-compose.yml`、`docs/development/stage-2-dev-setup.md`）。
  - 决策日志新增 `DEC-009`，固定阶段二采用“前端/插件 TS + 后端 FastAPI”。
- 变更原因：按阶段里程碑进入可运行代码骨架交付，支撑后续功能迭代。
- 影响范围：代码仓库结构、启动方式、API 骨架与测试基线。

### CHG-007：完成插件生态关键组件与MVP示例落地
- 变更内容：
  - 新增 `core/plugin-sdk/`，提供 `IPlugin` 接口、生命周期示例、平台通信封装、沙箱运行工具。
  - 新增 `plugins/templates/typescript-plugin-template/`（`package.json` 版本规范 + `manifest.json` 权限声明）。
  - 新增 `plugins/examples/product-translation/` 与 `plugins/examples/market-analysis/` 两个跨境电商 MVP 插件示例。
  - 新增 `plugins/sandbox/run_lifecycle_demo.py`，支持“安装 -> 配置 -> 使用 -> 卸载”全生命周期与权限隔离演示。
  - 新增开发文档 `docs/development/plugin-development-guide.md`，补充沙箱调试命令与示例日志。
  - 增强后端插件加载器与插件路由，新增 `configure/use` 生命周期接口与权限拦截。
- 变更原因：推进阶段三交付，形成可运行、可演示、可扩展的插件生态最小闭环。
- 影响范围：插件开发流程、平台插件管理接口、MVP 演示能力与后续生态扩展基线。

## 2026-04-26

### CHG-008：Phase 1 平台壳（项目 API + Web AppShell）与开发进度活文档
- 变更内容：
  - 后端新增 `Project` 模型与 `/api/v1/projects` 列表/创建/详情接口；测试依赖 `httpx`；`tests/conftest.py` 保证测试前 `init_db()`。
  - 前端新增 `globals.css`（Design Token）、`AppShell`（导航、项目切换、`localStorage` 当前项目）、`apiGet`；根布局接入壳层（登录/注册仍为全屏）。
  - 新增 **`docs/memory/development-status.md`**：接手阅读顺序、当前进度、待办、验证命令与环境说明，供后续团队快速对齐。
  - `docs/design/frontend-ui-spec-v1.md` 补充项目相关 API 与顶栏行为。
- 变更原因：落实「先搭架构与契约」策略，并把进度与后续事项从会话沉淀为可维护文档。
- 影响范围：新成员上手路径、前后端协作约定、下一阶段（`x-project-id`、占位页、Agent）依赖本基础。

### CHG-009：项目请求上下文（x-project-id）与三占位页
- 变更内容：
  - 中间件：可选 `x-project-id`，校验属于当前租户，写入 `request.state.project_id`；非法则 404。
  - 新增 `GET /api/v1/context` 返回 `tenant_id` / `project_id`；测试 `tests/test_context_api.py`。
  - 前端：`web/lib/constants.ts`；`apiGet`/`apiPost` 自动附加 `x-project-id`（来自 localStorage）。
  - 新增路由页 `/chat`、`/market`、`/workflow`（占位文案）；`AppShell` 导航链接。
  - 更新 `frontend-ui-spec-v1.md`、`development-status.md` 待办勾选。
- 变更原因：为超级 Agent、市场与工作流接入提供统一请求上下文，避免后期全量改接口。
- 影响范围：所有带项目选择的 API 调用、联调文档、后续业务路由开发。

### CHG-010：超级 Agent v1 骨架（推荐 + preflight）与对话页联调
- 变更内容：
  - 后端：`app/schemas/agent.py`、`app/services/agent_recommend.py`（规则引擎，两枚 MVP 插件目录）、`app/api/routes/agent.py`（`recommend` / `preflight`）；`main.py` 挂载路由。
  - 测试：`tests/test_agent_api.py`。
  - 前端：`web/app/chat/page.tsx` 调用 `apiPost`，展示推荐结果与 preflight JSON。
  - 文档：`frontend-ui-spec-v1.md` §6.1 矩阵；`development-status.md` 进度与验证条数。
- 变更原因：落实「轻核心 + 插件 + 超级 Agent」路线，先固定 API 契约与 UI 闭环，便于后续替换为 LLM 与市场检索而不改前端集成点。
- 影响范围：对话模式、运行前闸门扩展、OpenAPI `/api/v1/agent/*`。

### CHG-011：工作流 v1（持久化 + 只读 UI + 对话保存）
- 变更内容：
  - 后端：`Workflow` 模型与 `workflows` 表；`GET/POST /api/v1/workflows`、`GET /api/v1/workflows/{id}`；`project_id` 可来自 Body 或 `x-project-id` 上下文；`definition` JSON（`version` + `steps`）。
  - 测试：`tests/test_workflows_api.py`。
  - 前端：`/workflow` 客户端页（列表、线性步骤只读）；`/chat` 增加「保存为工作流」。
  - 文档：`frontend-ui-spec-v1.md` §6.1；`development-status.md`（含业务方说明）；本条目。
- 变更原因：落实路线图「先存储与只读可视化，再拖拽与执行」，并与 Agent 草案结构对齐，减少后续改契约成本。
- 影响范围：SQLite 需 `init_db()` 建新表；OpenAPI 新增 `/api/v1/workflows/*`。

### CHG-012：插件市场 MVP（目录 API + 市场页安装）
- 变更内容：
  - 后端：`app/services/marketplace_catalog.py`（与 MVP 插件 ID 对齐的静态目录）、`app/schemas/marketplace.py`、`app/api/routes/marketplace.py`；`GET /api/v1/marketplace/plugins`、`GET /api/v1/marketplace/plugins/{plugin_id}`；`main.py` 挂载路由。
  - 测试：`tests/test_marketplace_api.py`。
  - 前端：`/market` 拉取目录、展示卡片、`安装到租户` 调用既有 `POST /api/v1/plugins/install`；链到插件控制台。
  - 文档：`frontend-ui-spec-v1.md` §6；`development-status.md`。
- 变更原因：打通「发现插件 → 安装 → 控制台配置」演示路径；上架/计费仍后置，避免一次引入过多表结构。
- 影响范围：OpenAPI `/api/v1/marketplace/*`；与 `PluginLoader` 已知 `plugin_id` 保持一致。

### CHG-013：AI 网关 MVP（stub + OpenAI 兼容）
- 变更内容：
  - `app/core/config.py`：`get_ai_settings()`，每次调用读取 `AI_PROVIDER`、`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`。
  - `app/services/ai_gateway.py`：`stub`（默认）；`openai_compatible` / `openai` / `deepseek` 时使用 `httpx` 调用 `/v1/chat/completions`；缺密钥或 `BASE_URL` 时降级 stub 并带 `hint`；上游错误以 200 + `output.error` 反馈（便于前端统一解析）。
  - `core/backend/.env.example`：变量说明与 DeepSeek 示例。
  - 测试：`tests/test_ai_api.py`。
  - 文档：`stage-2-dev-setup.md`、`development-status.md`、`frontend-ui-spec-v1.md` §6.1。
- 变更原因：落实「核心统一调度、端侧不跑重模型」；先接通用 OpenAI 兼容协议，便于接 DeepSeek 与自建网关。
- 影响范围：部署需知悉外呼；密钥仅走环境变量，勿入库。

### CHG-014：插件控制台接入 AI 网关试调
- 变更内容：`web/app/dashboard/plugins/page.tsx` 每插件卡片增加 **AI 网关试调**，`apiPost` 调用 `POST /api/v1/ai/invoke`（payload 含当前配置与示例文案/品类）；顶部说明与后端 `AI_*` 环境变量对齐；更新 `development-status.md`、`frontend-ui-spec-v1.md` 页面地图。
- 变更原因：打通「安装/配置 → 核心调度」演示路径，无需额外页面即可验证 stub 或远程模型。
- 影响范围：仅前端交互；不改变插件生命周期 API。


### CHG-015：插件使用接口联动 AI 网关（MVP）
- 变更内容：
  - 后端：`POST /api/v1/plugins/use` 在 `api_name=ai:invoke` 且权限通过时，调用 `invoke_model`；响应 `PluginResponse` 新增 `lifecycle_events` 与可选 `output`。
  - 测试：新增 `tests/test_plugins_api.py` 覆盖 install/configure/use 联动与权限拒绝。
  - 文档：`development-status.md`、`frontend-ui-spec-v1.md` 交互矩阵。
- 变更原因：让「插件使用」不仅改状态，也返回可观察的调度结果，便于示例插件走向真实能力。
- 影响范围：`/api/v1/plugins/*` 响应结构向前扩展（新增字段，不破坏旧调用）。

### CHG-016：插件市场详情页（列表→详情→安装）
- 变更内容：
  - 前端新增 `web/app/market/[pluginId]/page.tsx`，调用 `GET /api/v1/marketplace/plugins/{plugin_id}` 展示描述、能力、案例与安装按钮。
  - `web/app/market/page.tsx` 增加「查看详情」入口，形成列表到详情闭环。
  - 文档：`frontend-ui-spec-v1.md` 页面地图与 API 矩阵、`development-status.md`。
- 变更原因：把市场从单页列表扩展为基础信息架构（IA），为后续订单/搜索/筛选提供稳定详情入口。
- 影响范围：前端新增动态路由 `/market/[pluginId]`；后端 API 复用既有市场详情接口。

### CHG-017：插件市场支持搜索/分类/分页（MVP）
- 变更内容：
  - 后端：`GET /api/v1/marketplace/plugins` 支持 `q`、`category`、`offset`、`limit`；新增 `GET /api/v1/marketplace/categories`。
  - 测试：扩展 `tests/test_marketplace_api.py` 覆盖搜索、分类分页、分类列表。
  - 前端：`/market` 增加关键词搜索、分类下拉、上一页/下一页（基于 `offset/limit`）。
  - 文档：`frontend-ui-spec-v1.md` 与 `development-status.md`。
- 变更原因：在不引入订单表的前提下先提升市场可用性，给后续「上架/订单」做用户路径预热。
- 影响范围：市场 API 查询参数与前端交互增强；保持向后兼容。


### CHG-018：计费/购买占位闭环（钱包 + 购买记录）
- 变更内容：
  - 后端新增 `Wallet`、`PluginPurchase` 模型；新增 `billing` 路由：`GET /wallet`、`POST /wallet/topup`、`GET /purchases`、`POST /purchase`。
  - 测试新增 `tests/test_billing_api.py`，覆盖默认钱包、充值、购买、购买列表。
  - 前端：`/market/[pluginId]` 增加余额展示与「购买（占位）」按钮，调用 `POST /api/v1/billing/purchase`，并刷新钱包余额。
  - 文档：`development-status.md`、`frontend-ui-spec-v1.md` 交互矩阵补齐计费接口。
- 变更原因：在真实支付接入前，先建立「余额/购买记录/购买按钮状态」接口骨架，支撑后续订单与 preflight 计费闸门。
- 影响范围：新增 `wallets`、`plugin_purchases` 表；OpenAPI 新增 `/api/v1/billing/*`。

### CHG-019：Agent preflight 接入购买与余额闸门
- 变更内容：
  - 后端新增 `app/services/agent_preflight.py`，预检规则：未购买 -> `needs_purchase`；已购买但余额不足 -> `needs_topup`；满足条件才 `allowed=true`。
  - `POST /api/v1/agent/preflight` 接入 DB 与 billing 数据，不再恒放行。
  - 测试：扩展 `tests/test_agent_api.py` 覆盖未购买、已购买但余额不足、已购买且已充值三种路径。
  - 前端：`/chat` 将 preflight 结果结构化展示（可执行状态、原因、购买/充值标记）。
- 变更原因：把「推荐→预检→执行」链路从文案占位提升到可执行闸门，减少误触发与无效执行。
- 影响范围：Agent 预检行为从静态占位改为计费感知；响应契约字段不变。

### CHG-020：支付/收款渠道接口骨架（支付宝/微信优先）
- 变更内容：
  - 计费 schema 新增支付/收款渠道模型与 `checkout` 契约，支付渠道含 `ALIPAY`、`WECHAT_PAY`（并保留 `WALLET`），收款渠道含 `ALIPAY`、`WECHAT_PAY`、`BANK_TRANSFER`。
  - 新增 `GET /api/v1/billing/channels`、`POST /api/v1/billing/checkout`、`POST /api/v1/billing/checkout/confirm`。
  - `/market/[pluginId]` 详情页新增渠道选择（支付宝/微信/钱包）并调用 `checkout`。
  - 测试扩展：`tests/test_billing_api.py` 覆盖渠道查询、外部渠道 pending->confirm、钱包直付。
- 变更原因：提前固定渠道抽象与订单接口，后续接真实支付宝/微信网关时只需替换实现层。
- 影响范围：`/api/v1/billing/*` 接口扩展；`plugin_purchases.status` 引入 `pending/paid/failed` 流转。

### CHG-021：订单状态页与支付结果自动刷新
- 变更内容：
  - 后端新增 `GET /api/v1/billing/purchases/{order_id}`。
  - 前端新增 `/billing/orders/[orderId]`：每 3 秒自动刷新待支付订单状态；提供模拟支付成功/失败按钮（调用 `checkout/confirm`）。
  - 市场详情页下单后自动跳转到订单状态页，形成“下单 -> 看状态 -> 完成支付 -> 去安装”闭环。
  - 测试扩展：`tests/test_billing_api.py` 新增订单详情查询与 404 用例。
- 变更原因：把支付链路从“仅下单”升级为“可观察状态流转”，便于联调与演示。
- 影响范围：新增动态路由 `/billing/orders/[orderId]`；billing API 增加订单详情读取能力。

### CHG-022：支付后自动安装与流程回跳
- 变更内容：
  - 前端 `/billing/orders/[orderId]` 在订单状态为 `paid` 后自动调用 `/api/v1/plugins/install`（可手动重试），并显示安装结果。
  - 市场详情页下单后跳转订单状态页时附带 `return_to=/chat`，订单页增加「返回上一流程」按钮。
  - 对话页 preflight 若提示需购买，新增“去购买首个推荐插件”入口。
- 变更原因：把“支付完成”与“可执行插件”连接成连续动作，减少用户手工切页与重复操作。
- 影响范围：前端支付链路体验增强；后端接口不变。

### CHG-023：支付回跳聊天后自动预检
- 变更内容：
  - 聊天页新增 `autopreflight` 逻辑：读取本地最近推荐插件 ID，在 `/chat?autopreflight=1` 时自动触发 preflight。
  - 聊天页 preflight 若需购买，提供直达市场详情入口，并携带 `return_to=/chat?autopreflight=1`。
  - 市场详情页读取 `return_to` 并透传至订单状态页，确保支付后可回到原流程。
- 变更原因：减少“购买完成后还要手动点预检”的步骤，让链路更接近一键闭环。
- 影响范围：前端路由参数与本地缓存逻辑增强；后端接口无变更。

### CHG-024：聊天页增加“立即运行推荐流程”入口
- 变更内容：
  - 聊天页在 preflight `allowed=true` 时显示“立即运行推荐流程”按钮。
  - 点击后按推荐步骤依次调用 `/api/v1/plugins/use`（`api_name=ai:invoke`），并实时展示每步日志（成功/失败）。
  - 保留原有手动预检与工作流保存能力。
- 变更原因：支付回流后给出直接执行入口，减少“可执行但不知道下一步”的决策成本。
- 影响范围：前端对话页交互增强；后端接口复用现有插件调用链路。

### CHG-025：支付安装完成后自动回聊并提示就绪
- 变更内容：
  - 订单状态页在“支付成功且安装完成”后，自动跳转 `return_to`，并附加 `flow_ready=1`。
  - 聊天页识别 `flow_ready=1`，展示“支付与安装已完成，推荐流程可直接执行”的提示条。
- 变更原因：减少用户在支付完成后的不确定感，明确告知“现在可以执行”。
- 影响范围：前端路由参数与提示体验增强；后端接口无变更。

### CHG-026：聊天页增加执行结果摘要卡
- 变更内容：
  - 聊天页在每次“一键运行推荐流程”后，生成执行摘要：总步骤、成功数、失败数、首个失败步骤。
  - 摘要持久化到 `localStorage`（键：`lp_last_flow_run_summary`），回流后仍可查看最近一次结果。
  - UI 提示在执行入口上方展示，帮助快速判断是否需要重跑或排错。
- 变更原因：给业务方一个更直观的“执行健康度”视图，减少只看日志逐行排查的成本。
- 影响范围：前端对话页状态管理增强；后端接口无变更。
