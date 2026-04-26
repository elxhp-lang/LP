from datetime import datetime

from pydantic import BaseModel, Field


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
