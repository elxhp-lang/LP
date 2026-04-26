from fastapi.testclient import TestClient
from uuid import uuid4

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


def test_agent_preflight_needs_purchase():
    tenant = f"test-tenant-agent-{uuid4()}"
    r = client.post(
        "/api/v1/agent/preflight",
        headers={"x-tenant-id": tenant},
        json={"plugin_ids": ["plugin.translation.gpt"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["allowed"] is False
    assert body["needs_purchase"] is True


def test_agent_preflight_needs_topup_after_purchase():
    tenant = f"test-tenant-agent-{uuid4()}"
    r = client.post(
        "/api/v1/billing/purchase",
        headers={"x-tenant-id": tenant},
        json={"plugin_id": "plugin.translation.gpt", "amount": 1, "currency": "CNY"},
    )
    assert r.status_code == 200

    r = client.post(
        "/api/v1/agent/preflight",
        headers={"x-tenant-id": tenant},
        json={"plugin_ids": ["plugin.translation.gpt"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["allowed"] is False
    assert body["needs_purchase"] is False
    assert body["needs_topup"] is True


def test_agent_preflight_allowed_after_purchase_and_topup():
    tenant = f"test-tenant-agent-{uuid4()}"
    client.post(
        "/api/v1/billing/purchase",
        headers={"x-tenant-id": tenant},
        json={"plugin_id": "plugin.translation.gpt", "amount": 1, "currency": "CNY"},
    )
    client.post(
        "/api/v1/billing/wallet/topup",
        headers={"x-tenant-id": tenant},
        json={"amount": 20},
    )
    r = client.post(
        "/api/v1/agent/preflight",
        headers={"x-tenant-id": tenant},
        json={"plugin_ids": ["plugin.translation.gpt"]},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["allowed"] is True
    assert body["needs_purchase"] is False
    assert body["needs_topup"] is False
