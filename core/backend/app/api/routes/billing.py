from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.billing import PluginPurchase, Wallet
from app.schemas.billing import (
    BillingChannelsResponse,
    CheckoutConfirmRequest,
    CheckoutCreateRequest,
    CheckoutCreateResponse,
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


@router.get("/channels", response_model=BillingChannelsResponse)
def billing_channels(request: Request):
    _ = request.state.tenant_id
    return BillingChannelsResponse(
        pay_channels=["WALLET", "ALIPAY", "WECHAT_PAY"],
        payout_channels=["ALIPAY", "WECHAT_PAY", "BANK_TRANSFER"],
    )


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


@router.get("/purchases/{order_id}", response_model=PurchaseResponse)
def get_purchase(order_id: str, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    row = db.scalar(
        select(PluginPurchase).where(
            PluginPurchase.id == order_id,
            PluginPurchase.tenant_id == tenant_id,
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="order not found")
    return row


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


@router.post("/checkout", response_model=CheckoutCreateResponse)
def create_checkout(payload: CheckoutCreateRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    wallet = _ensure_wallet(db, tenant_id)

    if payload.pay_channel == "WALLET":
        if wallet.balance < payload.amount:
            return CheckoutCreateResponse(
                order_id="",
                plugin_id=payload.plugin_id,
                amount=payload.amount,
                currency=payload.currency,
                pay_channel=payload.pay_channel,
                status="failed",
                next_action="topup_required",
            )
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
        return CheckoutCreateResponse(
            order_id=purchase.id,
            plugin_id=purchase.plugin_id,
            amount=purchase.amount,
            currency=purchase.currency,
            pay_channel=payload.pay_channel,
            status=purchase.status,
            next_action="install_or_configure",
        )

    purchase = PluginPurchase(
        id=str(uuid4()),
        tenant_id=tenant_id,
        plugin_id=payload.plugin_id,
        amount=payload.amount,
        currency=payload.currency,
        status="pending",
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    pay_url = f"https://pay.example.com/{payload.pay_channel.lower()}/{purchase.id}"
    return CheckoutCreateResponse(
        order_id=purchase.id,
        plugin_id=purchase.plugin_id,
        amount=purchase.amount,
        currency=purchase.currency,
        pay_channel=payload.pay_channel,
        status="pending",
        next_action="open_provider_cashier",
        pay_url=pay_url,
        qr_code=pay_url,
    )


@router.post("/checkout/confirm", response_model=PurchaseResponse)
def confirm_checkout(payload: CheckoutConfirmRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    row = db.scalar(
        select(PluginPurchase).where(
            PluginPurchase.id == payload.order_id,
            PluginPurchase.tenant_id == tenant_id,
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="order not found")
    row.status = "paid" if payload.paid else "failed"
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
