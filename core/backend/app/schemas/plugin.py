from pydantic import BaseModel


class InstallPluginRequest(BaseModel):
    plugin_id: str
    version: str


class ConfigurePluginRequest(BaseModel):
    plugin_id: str
    config: dict[str, object]


class UsePluginRequest(BaseModel):
    plugin_id: str
    action: str
    api_name: str | None = None


class PermissionCheckRequest(BaseModel):
    plugin_id: str
    permission_key: str


class PluginResponse(BaseModel):
    plugin_id: str
    status: str
