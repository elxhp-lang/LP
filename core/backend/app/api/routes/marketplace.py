from fastapi import APIRouter, HTTPException, Request

from app.schemas.marketplace import MarketplacePluginDetail, MarketplacePluginSummary
from app.services.marketplace_catalog import get_marketplace_plugin, list_marketplace_plugins

router = APIRouter()


@router.get("/plugins", response_model=list[MarketplacePluginSummary])
def marketplace_list_plugins(request: Request):
    _ = request.state.tenant_id
    return list_marketplace_plugins()


@router.get("/plugins/{plugin_id}", response_model=MarketplacePluginDetail)
def marketplace_get_plugin(plugin_id: str, request: Request):
    _ = request.state.tenant_id
    row = get_marketplace_plugin(plugin_id)
    if not row:
        raise HTTPException(status_code=404, detail="plugin not found in catalog")
    return row
