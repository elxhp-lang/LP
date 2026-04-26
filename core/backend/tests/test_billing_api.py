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


def test_channels_checkout_and_confirm():
    tenant = f"test-tenant-billing-{uuid4()}"
    r = client.get("/api/v1/billing/channels", headers={"x-tenant-id": tenant})
    assert r.status_code == 200
    body = r.json()
    assert "ALIPAY" in body["pay_channels"]
    assert "WECHAT_PAY" in body["pay_channels"]
    assert "ALIPAY" in body["payout_channels"]
    assert "WECHAT_PAY" in body["payout_channels"]

    # External channels create pending orders
    r = client.post(
        "/api/v1/billing/checkout",
        headers={"x-tenant-id": tenant},
        json={
            "plugin_id": "plugin.market.analysis.composer",
            "amount": 99,
            "currency": "CNY",
            "pay_channel": "ALIPAY",
        },
    )
    assert r.status_code == 200
    order = r.json()
    assert order["status"] == "pending"
    assert order["pay_channel"] == "ALIPAY"
    assert isinstance(order["pay_url"], str)
    assert isinstance(order["provider_order_no"], str)
    assert order["callback_verify_required"] is True

    r = client.post(
        "/api/v1/billing/checkout/confirm",
        headers={"x-tenant-id": tenant},
        json={"order_id": order["order_id"], "paid": True, "provider_trade_no": "ali_trade_001"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paid"


def test_checkout_callback_and_refund_placeholder():
    tenant = f"test-tenant-billing-{uuid4()}"
    headers = {"x-tenant-id": tenant}
    created = client.post(
        "/api/v1/billing/checkout",
        headers=headers,
        json={
            "plugin_id": "plugin.translation.gpt",
            "amount": 88,
            "currency": "CNY",
            "pay_channel": "WECHAT_PAY",
        },
    )
    assert created.status_code == 200
    order = created.json()
    assert order["status"] == "pending"

    bad_cb = client.post(
        "/api/v1/billing/checkout/callback",
        headers=headers,
        json={
            "order_id": order["order_id"],
            "pay_channel": "WECHAT_PAY",
            "provider_trade_no": "wx_trade_001",
            "trade_status": "SUCCESS",
            "signature": "bad_sig",
            "signed_payload": "raw",
            "sign_method": "RSA2",
        },
    )
    assert bad_cb.status_code == 200
    assert bad_cb.json()["verified"] is False
    assert bad_cb.json()["action"] == "reject_callback"

    ok_cb = client.post(
        "/api/v1/billing/checkout/callback",
        headers=headers,
        json={
            "order_id": order["order_id"],
            "pay_channel": "WECHAT_PAY",
            "provider_trade_no": "wx_trade_001",
            "trade_status": "SUCCESS",
            "signature": "mock_valid_signature",
            "signed_payload": "raw",
            "sign_method": "RSA2",
        },
    )
    assert ok_cb.status_code == 200
    assert ok_cb.json()["verified"] is True
    assert ok_cb.json()["action"] == "mark_paid"

    paid_order = client.get(f"/api/v1/billing/purchases/{order['order_id']}", headers=headers)
    assert paid_order.status_code == 200
    assert paid_order.json()["status"] == "paid"

    refund = client.post(
        "/api/v1/billing/refund",
        headers=headers,
        json={
            "order_id": order["order_id"],
            "amount": 20,
            "reason": "customer request",
            "payout_channel": "ALIPAY",
        },
    )
    assert refund.status_code == 200
    assert refund.json()["ok"] is True
    assert refund.json()["status"] == "pending"
    r = client.get(f"/api/v1/billing/purchases/{order['order_id']}", headers={"x-tenant-id": tenant})
    assert r.status_code == 200
    assert r.json()["status"] == "paid"

    # Wallet channel settles immediately
    client.post(
        "/api/v1/billing/wallet/topup",
        headers={"x-tenant-id": tenant},
        json={"amount": 120},
    )
    r = client.post(
        "/api/v1/billing/checkout",
        headers={"x-tenant-id": tenant},
        json={
            "plugin_id": "plugin.translation.gpt",
            "amount": 60,
            "currency": "CNY",
            "pay_channel": "WALLET",
        },
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paid"
    assert r.json()["callback_verify_required"] is False


def test_get_purchase_404():
    tenant = f"test-tenant-billing-{uuid4()}"
    r = client.get("/api/v1/billing/purchases/not-found", headers={"x-tenant-id": tenant})
    assert r.status_code == 404
