from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-market"


def test_marketplace_list():
    r = client.get("/api/v1/marketplace/plugins", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 2
    ids = {p["plugin_id"] for p in body}
    assert "plugin.translation.gpt" in ids


def test_marketplace_detail():
    r = client.get(
        "/api/v1/marketplace/plugins/plugin.translation.gpt",
        headers={"x-tenant-id": TENANT},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "商品翻译插件"


def test_marketplace_detail_404():
    r = client.get(
        "/api/v1/marketplace/plugins/unknown.plugin",
        headers={"x-tenant-id": TENANT},
    )
    assert r.status_code == 404
