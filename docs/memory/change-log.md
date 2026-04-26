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
