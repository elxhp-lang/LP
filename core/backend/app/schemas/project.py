from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class ProjectResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: str | None
    status: str

    model_config = {"from_attributes": True}
