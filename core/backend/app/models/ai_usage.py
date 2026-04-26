from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class AIUsageEvent(Base):
    __tablename__ = "ai_usage_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    plugin_id: Mapped[str] = mapped_column(String(200), index=True)
    task_type: Mapped[str] = mapped_column(String(120))
    units: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="success")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), index=True)


class AIQuota(Base):
    __tablename__ = "ai_quotas"

    tenant_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    quota_units: Mapped[int] = mapped_column(Integer, default=1000)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
    )


class AIAuditLog(Base):
    __tablename__ = "ai_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    plugin_id: Mapped[str] = mapped_column(String(200), index=True)
    task_type: Mapped[str] = mapped_column(String(120))
    provider: Mapped[str] = mapped_column(String(80), default="unknown")
    model: Mapped[str] = mapped_column(String(120), default="unknown")
    status: Mapped[str] = mapped_column(String(20), default="success")
    status_code: Mapped[str] = mapped_column(String(20), default="")
    error_message: Mapped[str] = mapped_column(String(1000), default="")
    request_preview: Mapped[str] = mapped_column(String(1000), default="")
    output_preview: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), index=True)


class AIRoutePolicy(Base):
    __tablename__ = "ai_route_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    plugin_id: Mapped[str] = mapped_column(String(200), index=True, default="*")
    task_type: Mapped[str] = mapped_column(String(120), index=True, default="*")
    model_chain: Mapped[str] = mapped_column(String(500), default="")
    disabled_models: Mapped[str] = mapped_column(String(500), default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
    )


class AIBillingRecord(Base):
    __tablename__ = "ai_billing_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    plugin_id: Mapped[str] = mapped_column(String(200), index=True)
    task_type: Mapped[str] = mapped_column(String(120))
    billed_units: Mapped[int] = mapped_column(Integer, default=0)
    unit_price: Mapped[int] = mapped_column(Integer, default=1)
    billed_amount: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="charged")
    reason: Mapped[str] = mapped_column(String(500), default="")
    wallet_balance_after: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), index=True)
