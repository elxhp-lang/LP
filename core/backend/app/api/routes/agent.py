from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.agent import (
    AgentPreflightRequest,
    AgentPreflightResponse,
    AgentRecommendRequest,
    AgentRecommendResponse,
)
from app.services.agent_preflight import evaluate_preflight
from app.services.agent_recommend import recommend_from_user_message

router = APIRouter()


@router.post("/recommend", response_model=AgentRecommendResponse)
def agent_recommend(payload: AgentRecommendRequest, request: Request):
    """规则化推荐：同一契约可替换为 LLM + 市场检索。"""
    _ = request.state.tenant_id
    _ = getattr(request.state, "project_id", None)
    return recommend_from_user_message(payload.message)


@router.post("/preflight", response_model=AgentPreflightResponse)
def agent_preflight(
    payload: AgentPreflightRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """运行前检查：购买状态 + 余额占位规则。"""
    tenant_id = request.state.tenant_id
    _ = getattr(request.state, "project_id", None)
    return evaluate_preflight(db, tenant_id, payload.plugin_ids)
