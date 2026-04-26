from fastapi import APIRouter, Request

from app.schemas.agent import (
    AgentPreflightRequest,
    AgentPreflightResponse,
    AgentRecommendRequest,
    AgentRecommendResponse,
)
from app.services.agent_recommend import recommend_from_user_message

router = APIRouter()


@router.post("/recommend", response_model=AgentRecommendResponse)
def agent_recommend(payload: AgentRecommendRequest, request: Request):
    """规则化推荐：同一契约可替换为 LLM + 市场检索。"""
    _ = request.state.tenant_id
    _ = getattr(request.state, "project_id", None)
    return recommend_from_user_message(payload.message)


@router.post("/preflight", response_model=AgentPreflightResponse)
def agent_preflight(payload: AgentPreflightRequest, request: Request):
    """
    运行前检查占位：后续接订单、Token、RBAC。
    MVP 返回允许运行，并提示尚未接真实计费。
    """
    _ = request.state.tenant_id
    _ = getattr(request.state, "project_id", None)
    _ = payload.plugin_ids
    return AgentPreflightResponse(
        allowed=True,
        needs_purchase=False,
        needs_topup=False,
        detail="MVP：未接入真实购买/Token 校验，后续将在此统一闸门。",
    )
