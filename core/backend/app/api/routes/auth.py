from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.schemas.auth import AuthTokenResponse, LoginRequest, RegisterRequest
from app.services.crud import create_user, get_user_by_email

router = APIRouter()


@router.post("/register", response_model=AuthTokenResponse)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="email already exists")
    user = create_user(db, tenant_id, payload)
    token = create_access_token(subject=user.id, tenant_id=tenant_id)
    return AuthTokenResponse(access_token=token)


@router.post("/login", response_model=AuthTokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    tenant_id = request.state.tenant_id
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    token = create_access_token(subject=user.id, tenant_id=tenant_id)
    return AuthTokenResponse(access_token=token)
