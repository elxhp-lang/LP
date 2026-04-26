from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-plugins"


def test_plugins_use_returns_ai_output_for_ai_invoke():
    r = client.post(
        "/api/v1/plugins/install",
        headers={"x-tenant-id": TENANT},
        json={"plugin_id": "plugin.translation.gpt", "version": "0.1.0"},
    )
    assert r.status_code == 200
    assert r.json()["lifecycle_events"] == ["install"]

    r = client.post(
        "/api/v1/plugins/configure",
        headers={"x-tenant-id": TENANT},
        json={
            "plugin_id": "plugin.translation.gpt",
            "config": {"sourceLanguage": "zh-CN", "targetLanguage": "en-US"},
        },
    )
    assert r.status_code == 200
    assert "configure" in r.json()["lifecycle_events"]

    r = client.post(
        "/api/v1/plugins/use",
        headers={"x-tenant-id": TENANT},
        json={
            "plugin_id": "plugin.translation.gpt",
            "action": "translate-product",
            "api_name": "ai:invoke",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "active"
    assert body["output"]["model"] in ("stub", "gpt-3.5-turbo")
    assert body["output"]["output"]["taskType"] == "translate-product"
    assert "use:translate-product" in body["lifecycle_events"]


def test_plugins_use_forbidden_api_name():
    client.post(
        "/api/v1/plugins/install",
        headers={"x-tenant-id": TENANT},
        json={"plugin_id": "plugin.translation.gpt", "version": "0.1.0"},
    )
    r = client.post(
        "/api/v1/plugins/use",
        headers={"x-tenant-id": TENANT},
        json={
            "plugin_id": "plugin.translation.gpt",
            "action": "translate-product",
            "api_name": "market:read",
        },
    )
    assert r.status_code == 403
