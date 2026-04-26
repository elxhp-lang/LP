from unittest.mock import MagicMock
from uuid import uuid4

from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)


def test_ai_invoke_stub_by_default():
    tenant = f"test-tenant-ai-{uuid4()}"
    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": tenant},
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
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
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
    client.post("/api/v1/billing/wallet/topup", headers=headers, json={"amount": 200})

    r = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
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


def test_ai_task_model_route_map_hits(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("AI_MODEL", "fallback-model")
    monkeypatch.setenv("AI_TASK_MODEL_MAP", "translate:routed-model,summarize:sum-model")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": [{"message": {"content": "mock-routed-reply"}}]}

    called = {"model": ""}

    def fake_post(*args, **kwargs):
        called["model"] = kwargs["json"]["model"]
        return mock_resp

    monkeypatch.setattr("app.services.ai_gateway.httpx.post", fake_post)

    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": tenant},
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "payload": {"text": "hello"},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "routed-model"
    assert called["model"] == "routed-model"


def test_ai_model_fallback_to_second_candidate(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("AI_MODEL", "fallback-model")
    monkeypatch.setenv("AI_TASK_MODEL_MAP", "translate:primary-model")
    monkeypatch.setenv("AI_FALLBACK_MODELS", "backup-model")

    calls: list[str] = []

    def fake_post(*args, **kwargs):
        model = kwargs["json"]["model"]
        calls.append(model)
        if model == "primary-model":
            resp = MagicMock()
            resp.status_code = 429
            resp.text = "rate limited"
            raise httpx.HTTPStatusError("rate limited", request=MagicMock(), response=resp)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"choices": [{"message": {"content": "fallback-ok"}}]}
        return mock_resp

    monkeypatch.setattr("app.services.ai_gateway.httpx.post", fake_post)

    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": tenant},
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "hello"}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["model"] == "fallback-model"
    assert calls == ["primary-model", "fallback-model"]


def test_ai_route_policy_overrides_chain(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("AI_MODEL", "default-model")

    upsert = client.post(
        "/api/v1/ai/route/policies",
        headers=headers,
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "model_chain": "policy-model|default-model",
            "disabled_models": "",
        },
    )
    assert upsert.status_code == 200

    called = {"model": ""}

    def fake_post(*args, **kwargs):
        called["model"] = kwargs["json"]["model"]
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"choices": [{"message": {"content": "ok"}}]}
        return mock_resp

    monkeypatch.setattr("app.services.ai_gateway.httpx.post", fake_post)
    r = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "x"}},
    )
    assert r.status_code == 200
    assert called["model"] == "policy-model"


def test_ai_route_circuit_breaker_skips_hot_failed_model(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("AI_MODEL", "safe-model")
    monkeypatch.setenv("AI_ROUTE_BLOCK_THRESHOLD", "2")
    monkeypatch.setenv("AI_ROUTE_BLOCK_WINDOW_SEC", "3600")
    client.post("/api/v1/billing/wallet/topup", headers=headers, json={"amount": 1000})

    # Create 2 failed logs for bad-model via policy + forced failures.
    client.post(
        "/api/v1/ai/route/policies",
        headers=headers,
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "model_chain": "bad-model|safe-model",
            "disabled_models": "",
        },
    )

    calls: list[str] = []

    def fake_post(*args, **kwargs):
        model = kwargs["json"]["model"]
        calls.append(model)
        if model == "bad-model":
            resp = MagicMock()
            resp.status_code = 500
            resp.text = "boom"
            raise httpx.HTTPStatusError("boom", request=MagicMock(), response=resp)
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"choices": [{"message": {"content": "ok"}}]}
        return mock_resp

    monkeypatch.setattr("app.services.ai_gateway.httpx.post", fake_post)

    client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "1"}},
    )
    client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "2"}},
    )
    calls.clear()
    r = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "3"}},
    )
    assert r.status_code == 200
    # bad-model should be blocked by breaker on the third invoke.
    assert calls == ["safe-model"]


def test_ai_openai_missing_key_falls_back(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")

    r = client.post(
        "/api/v1/ai/invoke",
        headers={"x-tenant-id": tenant},
        json={
            "plugin_id": "p",
            "task_type": "t",
            "payload": {},
        },
    )
    assert r.status_code == 200
    assert r.json()["model"] == "stub"
    assert "hint" in r.json()["output"]


def test_ai_usage_summary_and_quota_update():
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}

    init_summary = client.get("/api/v1/ai/usage/summary", headers=headers)
    assert init_summary.status_code == 200
    assert init_summary.json()["quota_units"] == 1000
    assert init_summary.json()["used_units"] == 0

    client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "payload": {"text": "hello"},
        },
    )
    after_invoke = client.get("/api/v1/ai/usage/summary", headers=headers)
    assert after_invoke.status_code == 200
    assert after_invoke.json()["calls"] >= 1
    assert after_invoke.json()["used_units"] >= 1

    updated = client.post("/api/v1/ai/quota", headers=headers, json={"quota_units": 50})
    assert updated.status_code == 200
    assert updated.json()["quota_units"] == 50


def test_ai_invoke_deducts_wallet_balance(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": [{"message": {"content": "billing check ok"}}]}
    monkeypatch.setattr("app.services.ai_gateway.httpx.post", lambda *args, **kwargs: mock_resp)
    client.post("/api/v1/billing/wallet/topup", headers=headers, json={"amount": 200})
    before_wallet = client.get("/api/v1/billing/wallet", headers=headers).json()["balance"]

    r = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "billing check"}},
    )
    assert r.status_code == 200
    body = r.json()
    assert "billed_amount" in body["output"]
    assert body["output"]["billed_amount"] >= 1

    after_wallet = client.get("/api/v1/billing/wallet", headers=headers).json()["balance"]
    assert before_wallet - after_wallet == body["output"]["billed_amount"]


def test_ai_invoke_plugin_specific_unit_price(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("AI_UNIT_PRICE", "1")
    monkeypatch.setenv("AI_PLUGIN_UNIT_PRICE_MAP", "plugin.translation.gpt:3")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": [{"message": {"content": "price map"}}]}
    monkeypatch.setattr("app.services.ai_gateway.httpx.post", lambda *args, **kwargs: mock_resp)
    client.post("/api/v1/billing/wallet/topup", headers=headers, json={"amount": 200})

    r = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "price map"}},
    )
    assert r.status_code == 200
    output = r.json()["output"]
    assert output["unit_price"] == 3
    assert output["billed_amount"] == output["billed_units"] * 3


def test_ai_invoke_insufficient_balance_requires_topup(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": [{"message": {"content": "need topup"}}]}
    monkeypatch.setattr("app.services.ai_gateway.httpx.post", lambda *args, **kwargs: mock_resp)
    r = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "need topup"}},
    )
    assert r.status_code == 200
    output = r.json()["output"]
    assert output["billing_next_action"] == "topup_required"
    assert "insufficient" in output["error"]


def test_ai_billing_records_list(monkeypatch):
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    monkeypatch.setenv("AI_PROVIDER", "openai_compatible")
    monkeypatch.setenv("AI_API_KEY", "sk-test")
    monkeypatch.setenv("AI_BASE_URL", "https://api.example.com")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"choices": [{"message": {"content": "billing records"}}]}
    monkeypatch.setattr("app.services.ai_gateway.httpx.post", lambda *args, **kwargs: mock_resp)
    client.post("/api/v1/billing/wallet/topup", headers=headers, json={"amount": 200})
    client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={"plugin_id": "plugin.translation.gpt", "task_type": "translate", "payload": {"text": "records"}},
    )

    records = client.get("/api/v1/ai/billing/records?offset=0&limit=5", headers=headers)
    assert records.status_code == 200
    body = records.json()
    assert body["offset"] == 0
    assert body["limit"] == 5
    assert len(body["items"]) >= 1
    first = body["items"][0]
    assert first["plugin_id"] == "plugin.translation.gpt"
    assert first["status"] in ("charged", "failed")


def test_ai_audit_logs_list():
    tenant = f"test-tenant-ai-{uuid4()}"
    headers = {"x-tenant-id": tenant}

    invoke = client.post(
        "/api/v1/ai/invoke",
        headers=headers,
        json={
            "plugin_id": "plugin.translation.gpt",
            "task_type": "translate",
            "payload": {"text": "hello audit"},
        },
    )
    assert invoke.status_code == 200

    logs = client.get("/api/v1/ai/audit/logs?offset=0&limit=5", headers=headers)
    assert logs.status_code == 200
    body = logs.json()
    assert body["offset"] == 0
    assert body["limit"] == 5
    assert len(body["items"]) >= 1
    first = body["items"][0]
    assert first["plugin_id"] == "plugin.translation.gpt"
    assert first["task_type"] == "translate"
    assert first["status"] in ("success", "failed")
