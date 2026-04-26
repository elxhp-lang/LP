from pydantic import BaseModel, Field


class MarketplacePluginSummary(BaseModel):
    plugin_id: str
    name: str
    version: str = Field(description="当前市场上架的推荐版本")
    category: str
    tagline: str
    price_hint: str
    capabilities: list[str]


class MarketplacePluginDetail(MarketplacePluginSummary):
    description: str
    case_example: str
