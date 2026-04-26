# LP（跨平台插件化 AI 应用）

本仓库已完成：
- 阶段一：架构设计文档（`docs/architecture/stage-1-architecture.md`）
- 阶段二（当前）：核心平台代码骨架（Web + Backend + 插件模板）

## 快速入口

- 架构文档：`docs/architecture/stage-1-architecture.md`
- 开发说明：`docs/development/stage-2-dev-setup.md`
- 记忆库主文档：`docs/memory/project-memory.md`

## 阶段二交付范围

- Web（Next.js 15）：
  - App Router 骨架
  - 登录页、注册页
  - 插件管理后台基础页
- Backend（FastAPI）：
  - 认证 API（JWT）
  - 插件管理 API（安装/卸载/权限检查）
  - AI 调度 API
  - SQLAlchemy 模型与基础 CRUD
  - RBAC 中间件与插件加载器（预留 WebAssembly 沙箱接口）
  - WebSocket 同步通道预留
- 共享层与插件：
  - `@core/types` 共享模型
  - 插件模板骨架与生命周期接口
- 工程化：
  - Dockerfile 与 `docker-compose.yml`
  - 单元测试骨架（插件加载器）
