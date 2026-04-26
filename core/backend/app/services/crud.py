from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.plugin import Plugin
from app.models.user import User
from app.schemas.auth import RegisterRequest


def create_user(db: Session, tenant_id: str, payload: RegisterRequest) -> User:
    user = User(
        id=str(uuid4()),
        tenant_id=tenant_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_plugin(db: Session, plugin_id: str) -> Plugin | None:
    return db.scalar(select(Plugin).where(Plugin.id == plugin_id))
