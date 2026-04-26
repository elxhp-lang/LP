from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-agent"


def test_agent_recommend_returns_plugins():
    r = client.post(
        "/api/v1/agent/recommend",
        headers={"x-tenant-id": TENANT},
        json={"message": "我要把商品标题翻译成英文做跨境"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "intent_summary" in body
    assert len(body["plugins"]) >= 1
    ids = {p["plugin_id"] for p in body["plugins"]}
    assert "plugin.translation.gpt" in ids


def test_agent_preflight_mvp_allowed():
    r = client.post(
        "/api/v1/agent/preflight",
        headers={"x-tenant-id": TENANT},
        json={"plugin_ids": ["plugin.translation.gpt"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["allowed"] is True
