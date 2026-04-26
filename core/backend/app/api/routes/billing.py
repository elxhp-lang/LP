from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.billing import PluginPurchase, Wallet
from app.schemas.billing import (
    PurchaseCreateRequest,
    PurchaseResponse,
    WalletResponse,
    WalletTopupRequest,
)

router = APIRouter()


def _ensure_wallet(db: Session, tenant_id: str) -> Wallet:
    wallet = db.scalar(select(Wallet).where(Wallet.tenant_id == tenant_id))
    if wallet:
        return wallet
    wallet = Wallet(tenant_id=tenant_id, balance=0)
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


@router.get("/wallet", response_model=WalletResponse)
def get_wallet(request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    wallet = _ensure_wallet(db, tenant_id)
    return WalletResponse(tenant_id=wallet.tenant_id, balance=wallet.balance)


@router.post("/wallet/topup", response_model=WalletResponse)
def topup_wallet(payload: WalletTopupRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    wallet = _ensure_wallet(db, tenant_id)
    wallet.balance += payload.amount
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return WalletResponse(tenant_id=wallet.tenant_id, balance=wallet.balance)


@router.get("/purchases", response_model=list[PurchaseResponse])
def list_purchases(request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    rows = db.scalars(
        select(PluginPurchase)
        .where(PluginPurchase.tenant_id == tenant_id)
        .order_by(PluginPurchase.created_at.desc()),
    ).all()
    return rows


@router.post("/purchase", response_model=PurchaseResponse)
def create_purchase(payload: PurchaseCreateRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    wallet = _ensure_wallet(db, tenant_id)
    # MVP 占位：余额不足也允许，状态由后续支付网关决定。
    if wallet.balance >= payload.amount:
        wallet.balance -= payload.amount
        db.add(wallet)

    purchase = PluginPurchase(
        id=str(uuid4()),
        tenant_id=tenant_id,
        plugin_id=payload.plugin_id,
        amount=payload.amount,
        currency=payload.currency,
        status="paid",
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase
