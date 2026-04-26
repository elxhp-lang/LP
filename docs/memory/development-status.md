# 开发进度与接手说明（活文档）

> **用途**：新成员或外部团队接入时，**优先阅读本文件**，再按链接深入。  
> **维护规则**：每完成一个可演示里程碑或变更协作方式时，更新「当前进度」与「待办事项」；重大变更同步 `change-log.md` 与 `decisions.md`。

---

## 一、项目一句话

**轻核心 + 插件生态 + 超级 Agent（后期外接大模型，如 DeepSeek）**；Web 为主、移动后续对齐同一套 API。产品上有 **对话模式（小白）** 与 **Agent 插件自配** 两条路径，以及 **项目制 + 工作流**。

---

## 二、新人阅读顺序（约 30～60 分钟）

1. `docs/memory/project-memory.md` — 目标、边界、协作规则  
2. `docs/memory/decisions.md` — 已拍板决策（含技术栈、插件验收基线等）  
3. `docs/design/frontend-ui-spec-v1.md` — 前端 UI 初版规范、页面地图、**前后端接口矩阵**、环境变量  
4. `docs/development/stage-2-dev-setup.md` — 本地/Docker 启动  
5. `docs/development/plugin-development-guide.md` — 插件与沙箱调试  
6. `docs/architecture/stage-1-architecture.md` — 总体架构依据  

---

## 三、当前进度（截至文档更新日）

### 已具备能力

| 领域 | 状态 | 说明 |
|------|------|------|
| 后端骨架 | 可用 | FastAPI：认证、插件 install/configure/use/uninstall、AI 路由占位、健康检查 |
| 插件生态 MVP | 可用 | SDK、TS 模板、两个示例插件、沙箱脚本、权限隔离演示；`/plugins/use` 已返回 `lifecycle_events`，且 `api_name=ai:invoke` 可回传网关输出 |
| 项目（租户下） | 可用 | `GET/POST /api/v1/projects`、`GET /api/v1/projects/{id}`；表 `projects` |
| Web 壳层 | 可用 | 全局 Design Token、`AppShell` 顶栏、项目下拉与新建、`/dashboard/plugins` 科技风控制台（含 **AI 网关试调** → `/api/v1/ai/invoke`） |
| 项目请求上下文 | 可用 | 可选 Header `x-project-id`；中间件校验租户归属；`GET /api/v1/context`；前端 `apiGet`/`apiPost` 自动带头 |
| 占位路由 | 已替代 | `/market` 已接 **目录 API + 安装**，并新增 `/market/[pluginId]` 详情页；`/chat` 已接 **Agent 推荐 + preflight**；`/workflow` 已接 **列表 + 只读步骤** |
| 超级 Agent v1（骨架） | 可用 | `POST /api/v1/agent/recommend`、`/preflight`；规则引擎 + 契约与后续 LLM 对齐；`preflight` 已接购买/余额闸门；`/chat` 表单联调 |
| 工作流持久化 v1 | 可用 | 表 `workflows`；`GET/POST /api/v1/workflows`、`GET /{id}`；定义 JSON `version`+`steps`；`/chat` 可保存草案 |
| 插件市场 MVP | 可用 | 市场支持 `q/category/offset/limit` 搜索筛选分页、`GET /api/v1/marketplace/categories`、详情页与安装闭环 |
| AI 网关 MVP | 可用 | `POST /api/v1/ai/invoke`：`stub`（默认）或 `openai_compatible`（`AI_*` 环境变量，兼容 DeepSeek/OpenAI 类接口） |
| 计费/购买占位 | 可用 | `wallet/topup/purchases/purchase` + `channels/checkout/checkout-confirm`；支付渠道优先含支付宝、微信；订单状态页支持自动刷新、自动安装与回跳 |
| 前端规范 | 草案 | `frontend-ui-spec-v1.md`，确认后可标为 frozen |
| 自动化验证 | 已跑通 | 后端 `pytest`（含 projects API）；**接手后请在 `core/backend` 下定期执行** |

### 最近一次自动化验证（由开发侧执行，非业务方操作）

- 命令：`cd core/backend && .venv\Scripts\python -m pytest -q`  
- 结果：**31 passed**（含订单详情接口与状态页、支付渠道 ALIPAY/WECHAT、Agent preflight 计费闸门、billing 钱包/购买等）  
- 健康检查：`GET http://127.0.0.1:8000/health` → **200**（需本地已启动后端）  

> **数据库说明**：若在增加 `projects` 表之前已有 `lp.db`，需**重启后端**或确保启动时执行 `init_db()`，以便 SQLite `create_all` 创建新表。

---

## 四、待办事项（按推荐顺序）

以下与产品路线图一致，供排期拆 Sprint。

1. ~~**请求上下文**：前端在 API 中携带当前项目（`x-project-id`），后端校验并写入 `request.state.project_id`。~~（已完成）  
2. ~~**占位页面**：`/chat`、`/market`、`/workflow` 与导航。~~（已完成）  
3. ~~**超级 Agent v1（MVP）**：规则推荐 + preflight 占位 API + `/chat` 展示。~~（已完成骨架；后续再接真实计费闸门与 LLM）  
4. ~~**工作流 v1**：线性步骤存储 + 列表/只读展示 + 对话页保存。~~（已完成；后续 DAG 编辑、执行态、日志）  
5. **插件市场扩展**：上架审核、订单与支付联调（当前为目录 + 搜索筛选分页 + 列表/详情 + 安装 + 购买占位）。  
6. **移动端**：执行与查看优先，API 与 Web 共用。  
7. **AI 网关进阶**：调用配额、用量统计、审计日志、多模型路由（当前已具备 stub + OpenAI 兼容 HTTP）。  
8. **示例插件做实**：真实模型调用、评测与计费扣次。  

### 给业务方（非技术）

- **技术路线与下一版做什么**：由开发侧按上表「待办」与架构文档**自主排期**，无需逐项拍板接口或框架。
- **您需要关心的**：产品目标是否变化（例如先做移动端、先上市场页）；若有变化，用自然语言说明即可。
- **进度怎么看**：看上文「已具备能力」与「待办」勾选；细节变更在 `change-log.md`。

---

## 五、环境与配置速查

| 位置 | 内容 |
|------|------|
| `web/.env.example` | `NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_TENANT_ID` 等 |
| `core/backend/.env.example` | `AI_PROVIDER`、`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`（可选） |
| 后端默认库 | `core/backend/lp.db`（SQLite，开发用） |
| 当前项目（前端） | `localStorage` 键：`lp_current_project_id` |

---

## 六、相关仓库与文档索引

- 插件沙箱：`plugins/sandbox/run_lifecycle_demo.py`  
- OpenAPI：`http://localhost:8000/docs`（本地启动后）  
- 变更记录：`docs/memory/change-log.md`  

---

## 七、版本记录

| 日期 | 说明 |
|------|------|
| 2026-04-26 | 初版：进度表、接手顺序、待办、验证方式 |
| 2026-04-26 | 补充：`x-project-id` 中间件、`/api/v1/context`、占位页与文档同步 |
| 2026-04-26 | 超级 Agent：`/api/v1/agent/recommend` & `preflight`，`/chat` 联调；`pytest` 11 passed |
| 2026-04-26 | 工作流：`workflows` API、`/workflow` 只读页、`/chat` 保存；`pytest` 14 passed |
| 2026-04-26 | 市场：`/api/v1/marketplace/plugins`、`/market` 联调安装；`pytest` 17 passed |
| 2026-04-26 | AI 网关：`openai_compatible` + 环境变量、`core/backend/.env.example`；`pytest` 20 passed |
| 2026-04-26 | 插件控制台：「AI 网关试调」按钮联调 `POST /api/v1/ai/invoke` |
| 2026-04-26 | 插件 API：`/plugins/use` 返回 `lifecycle_events`，`api_name=ai:invoke` 时带 `output`；`pytest` 22 passed |
| 2026-04-26 | 市场详情页：`/market/[pluginId]` 联调 `GET /api/v1/marketplace/plugins/{plugin_id}` 并支持安装 |
| 2026-04-26 | 市场扩展：`/market` 搜索/分类/分页；后端 `q/category/offset/limit` + `/categories`；`pytest` 25 passed |
| 2026-04-26 | 计费占位：`/api/v1/billing/*`（wallet/topup/purchases/purchase），详情页新增购买按钮；`pytest` 27 passed |
| 2026-04-26 | Agent preflight：按购买记录 + 余额判断 `allowed`，`/chat` 结构化展示结果；`pytest` 29 passed |
| 2026-04-26 | 支付渠道接口：`/billing/channels`、`/checkout`、`/checkout/confirm`（支付宝/微信/钱包）；`pytest` 30 passed |
| 2026-04-26 | 订单状态页：`/billing/orders/[orderId]` 自动刷新，支持模拟支付成功/失败；`pytest` 31 passed |
| 2026-04-26 | 支付闭环增强：订单页支付成功后自动安装插件，并支持回跳到来源流程（如 `/chat`） |
| 2026-04-26 | 一键闭环：聊天 preflight 失败可直达购买，回跳 `/chat?autopreflight=1` 自动再次预检 |
| 2026-04-26 | 一键执行：聊天 preflight 通过后新增“立即运行推荐流程”按钮，逐步调用插件并展示执行日志 |
| 2026-04-26 | 支付就绪提示：订单页安装成功后自动回聊天并附带 `flow_ready=1`，聊天页显著提示“可直接执行” |
| 2026-04-26 | 执行摘要卡：聊天页展示最近一次流程执行成功/失败统计与首个失败步骤，支持回流后快速判断状态 |
| 2026-04-26 | AI 用量 v1：`/ai/invoke` 自动记账，新增 `/ai/usage/summary` 与 `/ai/quota`，聊天页展示当月配额与用量 |
| 2026-04-26 | AI 审计 v1：`/ai/invoke` 同步写入审计日志，新增 `/ai/audit/logs` 分页查询，聊天页展示最近 5 条调用摘要 |
| 2026-04-26 | AI 路由 v1：支持 `AI_TASK_MODEL_MAP` 按 `task_type` 命中模型并回退默认模型，审计与聊天页显示命中模型 |
| 2026-04-26 | AI 路由 v2：支持候选链路 + 失败自动降级（`AI_FALLBACK_MODELS`），审计记录输出包含路由链路信息 |
| 2026-04-26 | AI 路由 v3：新增租户级 `route/policies`（插件+任务覆盖）与熔断窗口（失败阈值临时屏蔽模型） |
| 2026-04-26 | AI 计费联动 v1：远程 AI 成功调用按 units 扣钱包余额，余额不足返回 `topup_required` 并保留审计/用量记录 |
| 2026-04-26 | AI 计费联动 v2：支持 `AI_PLUGIN_UNIT_PRICE_MAP` 插件差异单价，并新增 `/ai/billing/records` 计费明细查询 |
| 2026-04-26 | 管理可视化 v1：插件控制台新增“AI 计费明细”与“AI 路由策略概览”面板，便于运营侧自助核对 |
