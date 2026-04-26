from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TENANT = "test-tenant-ai"


def test_ai_invoke_stub_by_default():
    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": TENANT},
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "payload": {"text": "hello"},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "stub"
    assert body["output"]["pluginId"] == "plugin.translation.gpt"
    assert "placeholder" in body["output"]["message"].lower()


def test_ai_openai_compatible_mocked(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("AI_MODEL", "test-model")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": [{"message": {"content": "mock-reply"}}]}

    def fake_post(*args, **kwargs):
        return mock_resp

    monkeypatch.setattr("app.services.ai_gateway.httpx.post", fake_post)

    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": TENANT},
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "payload": {"text": "hello"},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "test-model"
    assert body["output"]["message"] == "mock-reply"


def test_ai_openai_missing_key_falls_back(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")

    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": TENANT},
        json={
            "plugin_id": "p",
            "task_type": "t",
            "payload": {},
        },
    )
    assert r.status_code == 200
    assert r.json()["model"] == "stub"
    assert "hint" in r.json()["output"]
