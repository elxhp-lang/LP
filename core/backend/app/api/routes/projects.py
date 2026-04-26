from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreateRequest, ProjectResponse

router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
def list_projects(request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    rows = db.scalars(select(Project).where(Project.tenant_id == tenant_id).order_by(Project.name)).all()
    return rows


@router.post("", response_model=ProjectResponse)
def create_project(
    payload: ProjectCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    tenant_id = request.state.tenant_id
    project = Project(
        id=str(uuid4()),
        tenant_id=tenant_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        status="active",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    project = db.scalar(
        select(Project).where(Project.id == project_id, Project.tenant_id == tenant_id),
    )
    if not project:
        raise HTTPException(status_code=404, detail="project not found")
    return project
