from datetime import UTC, datetime
import json

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.ai_usage import AIAuditLog, AIQuota, AIUsageEvent
from app.schemas.ai import (
    AIAuditLogItem,
    AIAuditLogListResponse,
    AIInvokeRequest,
    AIInvokeResponse,
    AIQuotaUpdateRequest,
    AIUsageSummaryResponse,
)
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
    request_preview = json.dumps(payload.payload, ensure_ascii=False)[:1000]
    route_chain = result.get("route_chain")
    route_preview = ""
    if isinstance(route_chain, list) and route_chain:
        route_preview = f" [route: {' -> '.join(str(x) for x in route_chain[:5])}]"
    output_preview = f"{str(output.get('message', ''))[:850]}{route_preview}"[:1000]
    status_code = str(output.get("status_code", ""))[:20]
    error_message = str(output.get("error", ""))[:1000]
    event = AIUsageEvent(
        tenant_id=tenant_id,
        plugin_id=payload.plugin_id,
        task_type=payload.task_type,
        units=_estimate_units(payload, result),
        status=status,
    )
    audit = AIAuditLog(
        tenant_id=tenant_id,
        plugin_id=payload.plugin_id,
        task_type=payload.task_type,
        provider=str(result.get("provider", "stub"))[:80],
        model=str(result.get("route_model", result.get("model", "")))[:120],
        status=status,
        status_code=status_code,
        error_message=error_message,
        request_preview=request_preview,
        output_preview=output_preview,
    )
    db.add(event)
    db.add(audit)
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


@router.get("/audit/logs", response_model=AIAuditLogListResponse)
def list_audit_logs(
    request: Request,
    db: Session = Depends(get_db),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    tenant_id = request.state.tenant_id
    rows = db.scalars(
        select(AIAuditLog)
        .where(AIAuditLog.tenant_id == tenant_id)
        .order_by(AIAuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return AIAuditLogListResponse(
        items=[
            AIAuditLogItem(
                id=r.id,
                plugin_id=r.plugin_id,
                task_type=r.task_type,
                provider=r.provider,
                model=r.model,
                status=r.status,
                status_code=r.status_code,
                error_message=r.error_message,
                request_preview=r.request_preview,
                output_preview=r.output_preview,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in rows
        ],
        offset=offset,
        limit=limit,
    )
