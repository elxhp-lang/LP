from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project
from app.models.workflow import Workflow
from app.schemas.workflow import WorkflowCreateRequest, WorkflowResponse

router = APIRouter()


def _effective_project_id(payload: WorkflowCreateRequest, request: Request) -> str | None:
    if payload.project_id is not None:
        return payload.project_id.strip() or None
    return getattr(request.state, "project_id", None)


def _ensure_project(db: Session, tenant_id: str, project_id: str | None) -> None:
    if not project_id:
        return
    row = db.scalar(
        select(Project).where(Project.id == project_id, Project.tenant_id == tenant_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="project not found")


@router.post("", response_model=WorkflowResponse)
def create_workflow(
    payload: WorkflowCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = request.state.tenant_id
    project_id = _effective_project_id(payload, request)
    _ensure_project(db, tenant_id, project_id)
    wf = Workflow(
        id=str(uuid4()),
        tenant_id=tenant_id,
        project_id=project_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        definition={
            "version": 1,
            "steps": [s.model_dump() for s in payload.steps],
        },
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.get("", response_model=list[WorkflowResponse])
def list_workflows(
    request: Request,
    db: Session = Depends(get_db),
    project_id: str | None = Query(default=None, max_length=36),
):
    tenant_id = request.state.tenant_id
    q = select(Workflow).where(Workflow.tenant_id == tenant_id)
    if project_id:
        q = q.where(Workflow.project_id == project_id)
    rows = db.scalars(q.order_by(Workflow.created_at.desc())).all()
    return rows


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: str, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    row = db.scalar(
        select(Workflow).where(Workflow.id == workflow_id, Workflow.tenant_id == tenant_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="workflow not found")
    return row
