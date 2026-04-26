from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-workflows"


def _create_project(name: str = "WF 项目") -> str:
    r = client.post(
        "/api/v1/projects",
        headers={"x-tenant-id": TENANT},
        json={"name": name},
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_workflow_create_list_get():
    pid = _create_project()
    r = client.post(
        "/api/v1/workflows",
        headers={"x-tenant-id": TENANT, "x-project-id": pid},
        json={
            "name": "翻译后分析",
            "description": "从对话保存",
            "steps": [
                {"plugin_id": "plugin.translation.gpt", "title": "步骤：商品翻译插件"},
                {"plugin_id": "plugin.market.analysis.composer", "title": "步骤：市场分析插件"},
            ],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "翻译后分析"
    assert body["tenant_id"] == TENANT
    assert body["project_id"] == pid
    assert body["definition"]["version"] == 1
    assert len(body["definition"]["steps"]) == 2
    wid = body["id"]

    r = client.get(
        "/api/v1/workflows",
        headers={"x-tenant-id": TENANT},
        params={"project_id": pid},
    )
    assert r.status_code == 200
    rows = r.json()
    assert any(w["id"] == wid for w in rows)

    r = client.get(f"/api/v1/workflows/{wid}", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    assert r.json()["id"] == wid


def test_workflow_unknown_project():
    r = client.post(
        "/api/v1/workflows",
        headers={"x-tenant-id": TENANT},
        json={
            "name": "坏项目",
            "project_id": "00000000-0000-0000-0000-000000000000",
            "steps": [{"plugin_id": "p", "title": "t"}],
        },
    )
    assert r.status_code == 404


def test_workflow_other_tenant_not_visible():
    r = client.post(
        "/api/v1/workflows",
        headers={"x-tenant-id": TENANT},
        json={"name": "私密流", "steps": [{"plugin_id": "p", "title": "t"}]},
    )
    assert r.status_code == 200
    wid = r.json()["id"]
    r = client.get(f"/api/v1/workflows/{wid}", headers={"x-tenant-id": "other-tenant"})
    assert r.status_code == 404
