from app.services.plugin_loader import PluginLoader


def test_plugin_loader_registers_runtime():
    loader = PluginLoader()

    runtime = loader.load_plugin("plugin.translation.gpt", "0.1.0")

    assert runtime.plugin_id == "plugin.translation.gpt"
    assert runtime.status == "installed"
    assert runtime.lifecycle_events == ["install"]
    assert loader.has_plugin("plugin.translation.gpt") is True


def test_plugin_loader_can_unload_runtime():
    loader = PluginLoader()
    loader.load_plugin("plugin.market.analysis.composer")

    loader.unload_plugin("plugin.market.analysis.composer")

    assert loader.has_plugin("plugin.market.analysis.composer") is False


def test_plugin_loader_full_lifecycle():
    loader = PluginLoader()
    loader.load_plugin("plugin.translation.gpt", "0.1.0")

    runtime = loader.configure_plugin(
        "plugin.translation.gpt",
        {"sourceLanguage": "zh-CN", "targetLanguage": "en-US"},
    )
    assert runtime.status == "configured"

    runtime = loader.use_plugin("plugin.translation.gpt", "translate-product")
    assert runtime.status == "active"
    assert runtime.lifecycle_events == ["install", "configure", "use:translate-product"]


def test_permission_isolation_blocks_unapproved_api():
    loader = PluginLoader()
    loader.load_plugin("plugin.translation.gpt")

    try:
        loader.call_api("plugin.translation.gpt", "market:read")
        assert False, "expected permission error"
    except PermissionError:
        assert True
