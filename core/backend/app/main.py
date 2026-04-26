from fastapi import FastAPI, WebSocket

from app.api.routes import ai, auth, plugins
from app.core.middleware import RBACMiddleware
from app.db.init_db import init_db
from app.services.plugin_loader import PluginLoader

app = FastAPI(
    title="LP Core Platform API",
    description="阶段二核心骨架。设计依据见 docs/architecture/stage-1-architecture.md",
    version="0.1.0",
)

app.add_middleware(RBACMiddleware)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(plugins.router, prefix="/api/v1/plugins", tags=["plugins"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])

plugin_loader = PluginLoader()


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/sync/{tenant_id}")
async def realtime_sync(websocket: WebSocket, tenant_id: str) -> None:
    """
    双端实时同步通道预留，后续可用于插件状态广播/任务进度同步。
    """
    await websocket.accept()
    await websocket.send_json({"message": "sync channel reserved", "tenantId": tenant_id})
    await websocket.close()
