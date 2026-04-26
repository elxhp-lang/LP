from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_local_web_origin_can_call_api():
    response = client.get(
        "/api/v1/projects",
        headers={
            "origin": "http://localhost:3000",
            "x-tenant-id": "test-tenant-cors",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_local_web_origin_preflight_allows_tenant_header():
    response = client.options(
        "/api/v1/projects",
        headers={
            "origin": "http://localhost:3000",
            "access-control-request-method": "GET",
            "access-control-request-headers": "x-tenant-id",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "x-tenant-id" in response.headers["access-control-allow-headers"]
