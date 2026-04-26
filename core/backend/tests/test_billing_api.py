from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_wallet_default_and_topup():
    tenant = f"test-tenant-billing-{uuid4()}"
    r = client.get("/api/v1/billing/wallet", headers={"x-tenant-id": tenant})
    assert r.status_code == 200
    assert r.json()["balance"] == 0

    r = client.post(
        "/api/v1/billing/wallet/topup",
        headers={"x-tenant-id": tenant},
        json={"amount": 120},
    )
    assert r.status_code == 200
    assert r.json()["balance"] == 120


def test_purchase_and_list():
    tenant = f"test-tenant-billing-{uuid4()}"
    client.post(
        "/api/v1/billing/wallet/topup",
        headers={"x-tenant-id": tenant},
        json={"amount": 100},
    )
    r = client.post(
        "/api/v1/billing/purchase",
        headers={"x-tenant-id": tenant},
        json={"plugin_id": "plugin.translation.gpt", "amount": 80, "currency": "CNY"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["plugin_id"] == "plugin.translation.gpt"
    assert body["status"] == "paid"

    r = client.get("/api/v1/billing/wallet", headers={"x-tenant-id": tenant})
    assert r.status_code == 200
    assert r.json()["balance"] >= 20

    r = client.get("/api/v1/billing/purchases", headers={"x-tenant-id": tenant})
    assert r.status_code == 200
    assert any(x["plugin_id"] == "plugin.translation.gpt" for x in r.json())
