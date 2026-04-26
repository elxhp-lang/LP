from pydantic import BaseModel


class Settings(BaseModel):
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    token_exp_minutes: int = 60
    database_url: str = "sqlite:///./lp.db"


settings = Settings()
