from fastapi import APIRouter, Request

from app.schemas.ai import AIInvokeRequest, AIInvokeResponse
from app.services.ai_gateway import invoke_model

router = APIRouter()


@router.post("/invoke", response_model=AIInvokeResponse)
def invoke_ai(payload: AIInvokeRequest, request: Request):
    _ = request.state.tenant_id
    result = invoke_model(payload)
    return AIInvokeResponse(**result)
