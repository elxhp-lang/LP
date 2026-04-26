from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.billing import PluginPurchase, Wallet
from app.schemas.agent import AgentPreflightResponse

MIN_BALANCE_PER_PLUGIN = 10


def evaluate_preflight(db: Session, tenant_id: str, plugin_ids: list[str]) -> AgentPreflightResponse:
    ordered: list[str] = []
    seen: set[str] = set()
    for pid in plugin_ids:
        key = pid.strip()
        if key and key not in seen:
            seen.add(key)
            ordered.append(key)

    if not ordered:
        return AgentPreflightResponse(
            allowed=True,
            needs_purchase=False,
            needs_topup=False,
            detail="未指定插件，默认允许继续（可先生成推荐方案再预检）。",
        )

    bought = set(
        db.scalars(
            select(PluginPurchase.plugin_id).where(
                PluginPurchase.tenant_id == tenant_id,
                PluginPurchase.status == "paid",
                PluginPurchase.plugin_id.in_(ordered),
            ),
        ).all(),
    )
    missing = [pid for pid in ordered if pid not in bought]
    if missing:
        return AgentPreflightResponse(
            allowed=False,
            needs_purchase=True,
            needs_topup=False,
            detail=f"存在未购买插件：{', '.join(missing)}。请先在市场完成购买。",
        )

    wallet = db.scalar(select(Wallet).where(Wallet.tenant_id == tenant_id))
    balance = wallet.balance if wallet else 0
    required = len(ordered) * MIN_BALANCE_PER_PLUGIN
    if balance < required:
        return AgentPreflightResponse(
            allowed=False,
            needs_purchase=False,
            needs_topup=True,
            detail=f"余额不足：当前 {balance}，建议至少 {required} 后再运行。",
        )

    return AgentPreflightResponse(
        allowed=True,
        needs_purchase=False,
        needs_topup=False,
        detail=f"预检通过：已购买且余额充足（当前 {balance}）。",
    )
