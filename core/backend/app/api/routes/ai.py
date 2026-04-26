from datetime import UTC, datetime
import json
from datetime import timedelta

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_ai_settings
from app.db.session import get_db
from app.models.ai_usage import AIAuditLog, AIBillingRecord, AIQuota, AIRoutePolicy, AIUsageEvent
from app.models.billing import Wallet
from app.schemas.ai import (
    AIAuditLogItem,
    AIAuditLogListResponse,
    AIBillingRecordItem,
    AIBillingRecordListResponse,
    AIInvokeRequest,
    AIInvokeResponse,
    AIQuotaUpdateRequest,
    AIRoutePolicyItem,
    AIRoutePolicyListResponse,
    AIRoutePolicyUpsertRequest,
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


def _ensure_wallet(db: Session, tenant_id: str) -> Wallet:
    wallet = db.scalar(select(Wallet).where(Wallet.tenant_id == tenant_id))
    if wallet:
        return wallet
    wallet = Wallet(tenant_id=tenant_id, balance=0)
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def _estimate_units(payload: AIInvokeRequest, result: dict) -> int:
    out = result.get("output", {})
    text = str(out.get("message", ""))
    payload_size = len(str(payload.payload))
    approx = max(1, (len(text) + payload_size) // 40)
    return approx


def _parse_models(text: str) -> list[str]:
    return [x.strip() for x in text.replace("|", ",").split(",") if x.strip()]


def _get_route_policy(db: Session, tenant_id: str, plugin_id: str, task_type: str) -> AIRoutePolicy | None:
    rows = db.scalars(
        select(AIRoutePolicy).where(
            AIRoutePolicy.tenant_id == tenant_id,
            AIRoutePolicy.plugin_id.in_([plugin_id, "*"]),
            AIRoutePolicy.task_type.in_([task_type, "*"]),
        )
    ).all()
    if not rows:
        return None
    rows.sort(
        key=lambda r: (
            1 if r.plugin_id == plugin_id else 0,
            1 if r.task_type == task_type else 0,
            r.updated_at.timestamp() if r.updated_at else 0,
        ),
        reverse=True,
    )
    return rows[0]


def _get_blocked_models(db: Session, tenant_id: str, plugin_id: str, task_type: str) -> set[str]:
    cfg = get_ai_settings()
    since = datetime.now(UTC).replace(tzinfo=None) - timedelta(seconds=cfg.route_block_window_sec)
    rows = db.execute(
        select(AIAuditLog.model, func.count())
        .where(
            AIAuditLog.tenant_id == tenant_id,
            AIAuditLog.plugin_id == plugin_id,
            AIAuditLog.task_type == task_type,
            AIAuditLog.status == "failed",
            AIAuditLog.created_at >= since,
        )
        .group_by(AIAuditLog.model)
    ).all()
    return {str(model) for model, cnt in rows if int(cnt) >= cfg.route_block_threshold and str(model).strip()}


@router.post("/invoke", response_model=AIInvokeResponse)
def invoke_ai(payload: AIInvokeRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    policy = _get_route_policy(db, tenant_id=tenant_id, plugin_id=payload.plugin_id, task_type=payload.task_type)
    preferred_chain = _parse_models(policy.model_chain) if policy and policy.model_chain else None
    blocked_models = _get_blocked_models(
        db,
        tenant_id=tenant_id,
        plugin_id=payload.plugin_id,
        task_type=payload.task_type,
    )
    if policy and policy.disabled_models:
        blocked_models.update(_parse_models(policy.disabled_models))
    result = invoke_model(payload, preferred_chain=preferred_chain, blocked_models=blocked_models)
    output = result.get("output", {})
    billed_units = _estimate_units(payload, result)
    cfg = get_ai_settings()
    unit_price = cfg.plugin_unit_price_map.get(payload.plugin_id, cfg.unit_price)
    billed_amount = billed_units * unit_price
    wallet = _ensure_wallet(db, tenant_id)

    status = "failed" if any(k in output for k in ("error", "status_code")) else "success"
    should_bill = status == "success" and str(result.get("provider", "stub")) != "stub"
    if should_bill:
        if wallet.balance < billed_amount:
            result["output"] = {
                "message": "ai quota billing failed: wallet balance is insufficient",
                "pluginId": payload.plugin_id,
                "taskType": payload.task_type,
                "error": "insufficient wallet balance",
                "billing_next_action": "topup_required",
                "required_amount": billed_amount,
                "wallet_balance": wallet.balance,
            }
            output = result["output"]
            status = "failed"
            db.add(
                AIBillingRecord(
                    tenant_id=tenant_id,
                    plugin_id=payload.plugin_id,
                    task_type=payload.task_type,
                    billed_units=billed_units,
                    unit_price=unit_price,
                    billed_amount=billed_amount,
                    status="failed",
                    reason="insufficient wallet balance",
                    wallet_balance_after=wallet.balance,
                )
            )
        else:
            wallet.balance -= billed_amount
            db.add(wallet)
            output["billed_units"] = billed_units
            output["unit_price"] = unit_price
            output["billed_amount"] = billed_amount
            output["wallet_balance"] = wallet.balance
            db.add(
                AIBillingRecord(
                    tenant_id=tenant_id,
                    plugin_id=payload.plugin_id,
                    task_type=payload.task_type,
                    billed_units=billed_units,
                    unit_price=unit_price,
                    billed_amount=billed_amount,
                    status="charged",
                    reason="ai invoke charge",
                    wallet_balance_after=wallet.balance,
                )
            )
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
        units=billed_units,
        status=status,
    )
    route_errors = result.get("route_errors", [])
    if isinstance(route_errors, list):
        for item in route_errors:
            text = str(item)
            model = text.split(":", 1)[0][:120]
            db.add(
                AIAuditLog(
                    tenant_id=tenant_id,
                    plugin_id=payload.plugin_id,
                    task_type=payload.task_type,
                    provider=str(result.get("provider", "stub"))[:80],
                    model=model or "unknown",
                    status="failed",
                    status_code="route_error",
                    error_message=text[:1000],
                    request_preview=request_preview,
                    output_preview="fallback candidate failed",
                )
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


@router.get("/route/policies", response_model=AIRoutePolicyListResponse)
def list_route_policies(request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    rows = db.scalars(
        select(AIRoutePolicy)
        .where(AIRoutePolicy.tenant_id == tenant_id)
        .order_by(AIRoutePolicy.updated_at.desc())
    ).all()
    return AIRoutePolicyListResponse(
        items=[
            AIRoutePolicyItem(
                id=r.id,
                plugin_id=r.plugin_id,
                task_type=r.task_type,
                model_chain=r.model_chain,
                disabled_models=r.disabled_models,
                updated_at=r.updated_at.isoformat() if r.updated_at else "",
            )
            for r in rows
        ]
    )


@router.get("/billing/records", response_model=AIBillingRecordListResponse)
def list_billing_records(
    request: Request,
    db: Session = Depends(get_db),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
):
    tenant_id = request.state.tenant_id
    rows = db.scalars(
        select(AIBillingRecord)
        .where(AIBillingRecord.tenant_id == tenant_id)
        .order_by(AIBillingRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return AIBillingRecordListResponse(
        items=[
            AIBillingRecordItem(
                id=r.id,
                plugin_id=r.plugin_id,
                task_type=r.task_type,
                billed_units=r.billed_units,
                unit_price=r.unit_price,
                billed_amount=r.billed_amount,
                status=r.status,
                reason=r.reason,
                wallet_balance_after=r.wallet_balance_after,
                created_at=r.created_at.isoformat() if r.created_at else "",
            )
            for r in rows
        ],
        offset=offset,
        limit=limit,
    )


@router.post("/route/policies", response_model=AIRoutePolicyItem)
def upsert_route_policy(payload: AIRoutePolicyUpsertRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    plugin_id = payload.plugin_id.strip() or "*"
    task_type = payload.task_type.strip() or "*"
    row = db.scalar(
        select(AIRoutePolicy).where(
            AIRoutePolicy.tenant_id == tenant_id,
            AIRoutePolicy.plugin_id == plugin_id,
            AIRoutePolicy.task_type == task_type,
        )
    )
    if row is None:
        row = AIRoutePolicy(
            tenant_id=tenant_id,
            plugin_id=plugin_id,
            task_type=task_type,
            model_chain=payload.model_chain.strip(),
            disabled_models=payload.disabled_models.strip(),
        )
    else:
        row.model_chain = payload.model_chain.strip()
        row.disabled_models = payload.disabled_models.strip()
    db.add(row)
    db.commit()
    db.refresh(row)
    return AIRoutePolicyItem(
        id=row.id,
        plugin_id=row.plugin_id,
        task_type=row.task_type,
        model_chain=row.model_chain,
        disabled_models=row.disabled_models,
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )
