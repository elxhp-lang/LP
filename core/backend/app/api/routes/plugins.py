from fastapi import APIRouter, HTTPException, Request

from app.schemas.plugin import (
    ConfigurePluginRequest,
    InstallPluginRequest,
    PermissionCheckRequest,
    PluginResponse,
    UsePluginRequest,
)
from app.services.plugin_loader import PluginLoader

router = APIRouter()
plugin_loader = PluginLoader()


@router.post("/install", response_model=PluginResponse)
def install_plugin(payload: InstallPluginRequest, request: Request):
    _ = request.state.tenant_id
    runtime = plugin_loader.load_plugin(payload.plugin_id, payload.version)
    return PluginResponse(plugin_id=runtime.plugin_id, status="installed")


@router.post("/uninstall/{plugin_id}", response_model=PluginResponse)
def uninstall_plugin(plugin_id: str, request: Request):
    _ = request.state.tenant_id
    plugin_loader.unload_plugin(plugin_id)
    return PluginResponse(plugin_id=plugin_id, status="uninstalled")


@router.post("/configure", response_model=PluginResponse)
def configure_plugin(payload: ConfigurePluginRequest, request: Request):
    _ = request.state.tenant_id
    if not plugin_loader.has_plugin(payload.plugin_id):
        raise HTTPException(status_code=404, detail=f"plugin '{payload.plugin_id}' is not installed")
    runtime = plugin_loader.configure_plugin(payload.plugin_id, payload.config)
    return PluginResponse(plugin_id=runtime.plugin_id, status=runtime.status)


@router.post("/use", response_model=PluginResponse)
def use_plugin(payload: UsePluginRequest, request: Request):
    _ = request.state.tenant_id
    if not plugin_loader.has_plugin(payload.plugin_id):
        raise HTTPException(status_code=404, detail=f"plugin '{payload.plugin_id}' is not installed")
    if payload.api_name:
        try:
            plugin_loader.call_api(payload.plugin_id, payload.api_name)
        except PermissionError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
    runtime = plugin_loader.use_plugin(payload.plugin_id, payload.action)
    return PluginResponse(plugin_id=runtime.plugin_id, status=runtime.status)


@router.post("/permission-check")
def permission_check(payload: PermissionCheckRequest, request: Request):
    _ = request.state.tenant_id
    # 这里先返回骨架结果。后续接 RBAC 引擎与插件权限白名单。
    if payload.permission_key.startswith("forbidden:"):
        raise HTTPException(status_code=403, detail="permission denied")
    return {"plugin_id": payload.plugin_id, "allowed": True}
