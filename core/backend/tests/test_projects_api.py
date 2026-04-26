from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-projects"


def test_projects_list_and_create():
    r = client.get("/api/v1/projects", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    initial = r.json()
    assert isinstance(initial, list)

    r = client.post(
        "/api/v1/projects",
        headers={"x-tenant-id": TENANT},
        json={"name": "MVP 默认项目", "description": "排期 Phase 1"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "MVP 默认项目"
    assert body["tenant_id"] == TENANT
    pid = body["id"]

    r = client.get("/api/v1/projects", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    assert len(r.json()) >= len(initial) + 1

    r = client.get(f"/api/v1/projects/{pid}", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    assert r.json()["id"] == pid


def test_projects_missing_tenant():
    r = client.get("/api/v1/projects")
    assert r.status_code == 400
