from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# NOTE:
# passlib+bcrypt can break on newer Python/bcrypt combinations in Windows dev envs.
# Use pbkdf2_sha256 for stable local hashing behavior.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, tenant_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.token_exp_minutes)
    payload = {"sub": subject, "tenant_id": tenant_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
