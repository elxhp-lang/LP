from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.ai_usage import AIQuota, AIUsageEvent
from app.schemas.ai import AIInvokeRequest, AIInvokeResponse, AIQuotaUpdateRequest, AIUsageSummaryResponse
from app.services.ai_gateway import invoke_model

router = APIRouter()


def _month_range_utc(now: datetime) -> tuple[datetime, datetime]:
    month_start = datetime(year=now.year, month=now.month, day=1)
    if now.month == 12:
        next_month = datetime(year=now.year + 1, month=1, day=1)
    else:
        next_month = datetime(year=now.year, month=now.month + 1, day=1)
    return month_start, next_month


def _ensure_quota(db: Session, tenant_id: str) -> AIQuota:
    quota = db.scalar(select(AIQuota).where(AIQuota.tenant_id == tenant_id))
    if quota:
        return quota
    quota = AIQuota(tenant_id=tenant_id, quota_units=1000)
    db.add(quota)
    db.commit()
    db.refresh(quota)
    return quota


def _estimate_units(payload: AIInvokeRequest, result: dict) -> int:
    out = result.get("output", {})
    text = str(out.get("message", ""))
    payload_size = len(str(payload.payload))
    approx = max(1, (len(text) + payload_size) // 40)
    return approx


@router.post("/invoke", response_model=AIInvokeResponse)
def invoke_ai(payload: AIInvokeRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    result = invoke_model(payload)
    output = result.get("output", {})
    status = "failed" if any(k in output for k in ("error", "status_code")) else "success"
    event = AIUsageEvent(
        tenant_id=tenant_id,
        plugin_id=payload.plugin_id,
        task_type=payload.task_type,
        units=_estimate_units(payload, result),
        status=status,
    )
    db.add(event)
    db.commit()
    return AIInvokeResponse(**result)


@router.get("/usage/summary", response_model=AIUsageSummaryResponse)
def usage_summary(request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    now = datetime.now(UTC).replace(tzinfo=None)
    month_start, next_month = _month_range_utc(now)
    quota = _ensure_quota(db, tenant_id)

    used_units = db.scalar(
        select(func.coalesce(func.sum(AIUsageEvent.units), 0)).where(
            AIUsageEvent.tenant_id == tenant_id,
            AIUsageEvent.created_at >= month_start,
            AIUsageEvent.created_at < next_month,
        )
    ) or 0
    calls = db.scalar(
        select(func.count())
        .select_from(AIUsageEvent)
        .where(
            AIUsageEvent.tenant_id == tenant_id,
            AIUsageEvent.created_at >= month_start,
            AIUsageEvent.created_at < next_month,
        )
    ) or 0
    success_calls = db.scalar(
        select(func.count())
        .select_from(AIUsageEvent)
        .where(
            AIUsageEvent.tenant_id == tenant_id,
            AIUsageEvent.created_at >= month_start,
            AIUsageEvent.created_at < next_month,
            AIUsageEvent.status == "success",
        )
    ) or 0
    failed_calls = calls - success_calls
    remaining = max(0, quota.quota_units - int(used_units))
    return AIUsageSummaryResponse(
        period=month_start.strftime("%Y-%m"),
        quota_units=quota.quota_units,
        used_units=int(used_units),
        remaining_units=remaining,
        calls=int(calls),
        success_calls=int(success_calls),
        failed_calls=int(failed_calls),
    )


@router.post("/quota", response_model=AIUsageSummaryResponse)
def update_quota(payload: AIQuotaUpdateRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    quota = _ensure_quota(db, tenant_id)
    quota.quota_units = max(0, payload.quota_units)
    db.add(quota)
    db.commit()
    return usage_summary(request=request, db=db)
