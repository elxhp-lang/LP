from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-context"


def test_context_without_project_header():
    r = client.get("/api/v1/context", headers={"x-tenant-id": TENANT})
    assert r.status_code == 200
    body = r.json()
    assert body["tenant_id"] == TENANT
    assert body["project_id"] is None


def test_context_with_valid_project():
    r = client.post(
        "/api/v1/projects",
        headers={"x-tenant-id": TENANT},
        json={"name": "ctx-proj", "description": None},
    )
    assert r.status_code == 200
    pid = r.json()["id"]

    r = client.get(
        "/api/v1/context",
        headers={"x-tenant-id": TENANT, "x-project-id": pid},
    )
    assert r.status_code == 200
    assert r.json()["project_id"] == pid


def test_context_rejects_bad_project():
    r = client.get(
        "/api/v1/context",
        headers={"x-tenant-id": TENANT, "x-project-id": "00000000-0000-0000-0000-000000000000"},
    )
    assert r.status_code == 404
