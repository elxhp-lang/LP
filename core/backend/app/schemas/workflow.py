from datetime import datetime

from pydantic import BaseModel, Field


class WorkflowStepPayload(BaseModel):
    plugin_id: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=300)


class WorkflowCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    project_id: str | None = Field(default=None, max_length=36)
    steps: list[WorkflowStepPayload] = Field(min_length=1)


class WorkflowResponse(BaseModel):
    id: str
    tenant_id: str
    project_id: str | None
    name: str
    description: str | None
    definition: dict
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
