from datetime import datetime

from pydantic import BaseModel, Field
from typing import Literal

PayChannel = Literal["WALLET", "ALIPAY", "WECHAT_PAY"]
PayoutChannel = Literal["ALIPAY", "WECHAT_PAY", "BANK_TRANSFER"]


class WalletResponse(BaseModel):
    tenant_id: str
    balance: int


class WalletTopupRequest(BaseModel):
    amount: int = Field(ge=1, le=1_000_000)


class PurchaseCreateRequest(BaseModel):
    plugin_id: str = Field(min_length=1, max_length=200)
    amount: int = Field(ge=0, le=1_000_000)
    currency: str = Field(default="CNY", max_length=10)


class PurchaseResponse(BaseModel):
    id: str
    tenant_id: str
    plugin_id: str
    amount: int
    currency: str
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class BillingChannelsResponse(BaseModel):
    pay_channels: list[PayChannel]
    payout_channels: list[PayoutChannel]


class CheckoutCreateRequest(BaseModel):
    plugin_id: str = Field(min_length=1, max_length=200)
    amount: int = Field(ge=1, le=1_000_000)
    currency: str = Field(default="CNY", max_length=10)
    pay_channel: PayChannel = "ALIPAY"
    subject: str | None = Field(default=None, max_length=200)


class CheckoutCreateResponse(BaseModel):
    order_id: str
    plugin_id: str
    amount: int
    currency: str
    pay_channel: PayChannel
    status: str
    next_action: str
    pay_url: str | None = None
    qr_code: str | None = None
    provider_order_no: str | None = None
    callback_url: str | None = None
    callback_verify_required: bool = True
    refund_supported: bool = False


class CheckoutConfirmRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=36)
    paid: bool = True
    provider_trade_no: str | None = Field(default=None, max_length=120)


class CheckoutCallbackRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=36)
    pay_channel: PayChannel
    provider_trade_no: str = Field(min_length=1, max_length=120)
    trade_status: str = Field(min_length=1, max_length=60)
    signature: str = Field(min_length=1, max_length=500)
    signed_payload: str = Field(min_length=1, max_length=4000)
    sign_method: str = Field(default="RSA2", min_length=1, max_length=30)


class CheckoutCallbackResponse(BaseModel):
    ok: bool
    verified: bool
    order_id: str
    pay_channel: PayChannel
    provider_trade_no: str
    trade_status: str
    action: str
    message: str


class RefundCreateRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=36)
    amount: int = Field(ge=1, le=1_000_000)
    reason: str | None = Field(default=None, max_length=200)
    payout_channel: PayoutChannel = "ALIPAY"


class RefundCreateResponse(BaseModel):
    ok: bool
    refund_id: str
    order_id: str
    amount: int
    payout_channel: PayoutChannel
    status: str
    next_action: str
    message: str
