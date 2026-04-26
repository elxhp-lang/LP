from pydantic import BaseModel


class AIInvokeRequest(BaseModel):
    plugin_id: str
    task_type: str
    payload: dict


class AIInvokeResponse(BaseModel):
    model: str
    output: dict


class AIUsageSummaryResponse(BaseModel):
    period: str
    quota_units: int
    used_units: int
    remaining_units: int
    calls: int
    success_calls: int
    failed_calls: int


class AIQuotaUpdateRequest(BaseModel):
    quota_units: int
