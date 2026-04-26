# 阶段二开发环境说明（核心平台代码骨架）

## 1. 目录说明

- `web/`：Next.js 15 Web 端骨架（登录、注册、插件管理后台）
- `core/types/`：跨端共享 TypeScript 数据模型
- `core/backend/`：FastAPI 核心服务骨架（认证、插件管理、AI 调度）
- `plugins/templates/base-plugin/`：插件开发模板

## 2. 快速启动（Docker）

在项目根目录执行：

```bash
docker compose up --build
```

启动后：
- Web：`http://localhost:3000`
- Backend：`http://localhost:8000`
- OpenAPI 文档：`http://localhost:8000/docs`

## 3. 本地启动（不使用 Docker）

### 后端

```bash
cd core/backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**AI 网关（可选）**：默认不连外网。复制 `core/backend/.env.example` 为 `.env` 并按需设置 `AI_PROVIDER`、`AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`（例如 DeepSeek：`https://api.deepseek.com` + `deepseek-chat`）。`POST /api/v1/ai/invoke` 会按配置走 **stub** 或 **OpenAI 兼容** Chat Completions。

### Web

```bash
cd web
npm install
npm run dev
```

## 4. 设计对齐说明

- 关键模块实现基于：`docs/architecture/stage-1-architecture.md`
- 插件生命周期、沙箱预留和租户隔离字段已在骨架中预留扩展点
- **前端 UI 初版规范（页面结构、Design Token、前后端交互矩阵、环境变量清单）**：`docs/design/frontend-ui-spec-v1.md`
- **开发进度、待办与接手说明（活文档）**：`docs/memory/development-status.md`
