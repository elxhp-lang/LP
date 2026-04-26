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


def test_marketplace_list_query_filter():
    r = client.get(
        "/api/v1/marketplace/plugins",
        headers={"x-tenant-id": TENANT},
        params={"q": "翻译"},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) >= 1
    assert any(p["plugin_id"] == "plugin.translation.gpt" for p in body)


def test_marketplace_list_category_and_paging():
    r = client.get(
        "/api/v1/marketplace/plugins",
        headers={"x-tenant-id": TENANT},
        params={"category": "跨境 / 数据", "offset": 0, "limit": 1},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["plugin_id"] == "plugin.market.analysis.composer"


def test_marketplace_categories():
    r = client.get("/api/v1/marketplace/categories", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    body = r.json()
    assert "跨境 / 内容" in body
    assert "跨境 / 数据" in body
