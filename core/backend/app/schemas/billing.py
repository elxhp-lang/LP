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


class CheckoutConfirmRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=36)
    paid: bool = True
    provider_trade_no: str | None = Field(default=None, max_length=120)
