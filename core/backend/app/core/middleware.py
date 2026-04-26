from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class RBACMiddleware(BaseHTTPMiddleware):
    """
    RBAC 骨架中间件：
    1. 识别租户上下文
    2. 预留权限检查扩展点
    参考设计文档：docs/architecture/stage-1-architecture.md
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path.startswith("/api/"):
            tenant_id = request.headers.get("x-tenant-id")
            if not tenant_id:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "missing x-tenant-id header"},
                )
            request.state.tenant_id = tenant_id
        return await call_next(request)
