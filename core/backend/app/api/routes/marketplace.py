from fastapi import APIRouter, HTTPException, Query, Request

from app.schemas.marketplace import MarketplacePluginDetail, MarketplacePluginSummary
from app.services.marketplace_catalog import (
    get_marketplace_plugin,
    list_marketplace_categories,
    list_marketplace_plugins,
)

router = APIRouter()


@router.get("/plugins", response_model=list[MarketplacePluginSummary])
def marketplace_list_plugins(
    request: Request,
    q: str | None = Query(default=None, max_length=120),
    category: str | None = Query(default=None, max_length=120),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=50),
):
    _ = request.state.tenant_id
    return list_marketplace_plugins(query=q, category=category, offset=offset, limit=limit)


@router.get("/categories", response_model=list[str])
def marketplace_categories(request: Request):
    _ = request.state.tenant_id
    return list_marketplace_categories()


@router.get("/plugins/{plugin_id}", response_model=MarketplacePluginDetail)
def marketplace_get_plugin(plugin_id: str, request: Request):
    _ = request.state.tenant_id
    row = get_marketplace_plugin(plugin_id)
    if not row:
        raise HTTPException(status_code=404, detail="plugin not found in catalog")
    return row
