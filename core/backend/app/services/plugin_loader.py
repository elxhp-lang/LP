from dataclasses import dataclass, field


@dataclass
class PluginRuntime:
    plugin_id: str
    status: str
    version: str = "0.1.0"
    permissions: list[str] = field(default_factory=list)
    config: dict[str, object] = field(default_factory=dict)
    lifecycle_events: list[str] = field(default_factory=list)


class PluginLoader:
    """
    插件加载器骨架。后续接入 WebAssembly 运行时时，优先扩展 load_plugin 内部实现。
    参考文档：docs/architecture/stage-1-architecture.md（沙箱机制章节）
    """

    def __init__(self) -> None:
        self._registry: dict[str, PluginRuntime] = {}
        self._permissions_catalog: dict[str, list[str]] = {
            "plugin.translation.gpt": ["ai:invoke", "i18n:read", "i18n:write"],
            "plugin.market.analysis.composer": ["ai:invoke", "market:read", "chart:render"],
        }

    def load_plugin(self, plugin_id: str, version: str = "0.1.0") -> PluginRuntime:
        runtime = PluginRuntime(
            plugin_id=plugin_id,
            version=version,
            status="installed",
            permissions=self._permissions_catalog.get(plugin_id, []),
            lifecycle_events=["install"],
        )
        self._registry[plugin_id] = runtime
        return runtime

    def configure_plugin(self, plugin_id: str, config: dict[str, object]) -> PluginRuntime:
        runtime = self._registry[plugin_id]
        runtime.config = config
        runtime.status = "configured"
        runtime.lifecycle_events.append("configure")
        return runtime

    def use_plugin(self, plugin_id: str, action: str) -> PluginRuntime:
        runtime = self._registry[plugin_id]
        runtime.status = "active"
        runtime.lifecycle_events.append(f"use:{action}")
        return runtime

    def call_api(self, plugin_id: str, api_name: str) -> str:
        runtime = self._registry[plugin_id]
        if api_name not in runtime.permissions:
            raise PermissionError(f"plugin '{plugin_id}' has no permission '{api_name}'")
        return f"{plugin_id} -> {api_name}"

    def unload_plugin(self, plugin_id: str) -> None:
        runtime = self._registry.get(plugin_id)
        if runtime is None:
            return
        runtime.status = "uninstalled"
        runtime.lifecycle_events.append("uninstall")
        self._registry.pop(plugin_id, None)

    def has_plugin(self, plugin_id: str) -> bool:
        return plugin_id in self._registry

    def get_runtime(self, plugin_id: str) -> PluginRuntime | None:
        return self._registry.get(plugin_id)
