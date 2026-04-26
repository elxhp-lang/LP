from pydantic import BaseModel, Field


class PluginRecommendationCard(BaseModel):
    plugin_id: str
    name: str
    role: str
    price_hint: str
    capabilities: list[str]
    case_example: str


class WorkflowDraftStep(BaseModel):
    plugin_id: str
    title: str


class WorkflowDraft(BaseModel):
    steps: list[WorkflowDraftStep]


class AgentRecommendRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class AgentRecommendResponse(BaseModel):
    intent_summary: str
    plugins: list[PluginRecommendationCard]
    workflow_draft: WorkflowDraft
    billing_hints: list[str]
    next_actions: list[str]


class AgentPreflightRequest(BaseModel):
    plugin_ids: list[str] = Field(default_factory=list)


class AgentPreflightResponse(BaseModel):
    allowed: bool
    needs_purchase: bool
    needs_topup: bool
    detail: str
