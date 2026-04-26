from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/context")
def get_request_context(request: Request) -> dict[str, str | None]:
    """Return resolved tenant and optional project (for debugging and client alignment)."""
    tenant_id = getattr(request.state, "tenant_id", None)
    project_id = getattr(request.state, "project_id", None)
    return {"tenant_id": tenant_id, "project_id": project_id}
